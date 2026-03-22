import { useCallback } from 'react';

interface CompositeOptions {
  subjectUrl: string;
  backgroundUrl: string | null;
  backgroundColor?: string;
  width?: number;
  height?: number;
  addWatermark?: boolean;
  scaleOverride?: number | null; // 0.3–1.2, null = auto
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

interface LightingProfile {
  // Global averages
  r: number; g: number; b: number; brightness: number;
  // Directional: left vs right half average color
  leftR: number; leftG: number; leftB: number; leftBright: number;
  rightR: number; rightG: number; rightB: number; rightBright: number;
  // Vertical: top vs bottom brightness
  topBright: number; bottomBright: number;
  // Color temperature: warm (>0) vs cool (<0)
  warmth: number;
  // Saturation intensity of the scene
  saturation: number;
}

/** Deep-analyze background lighting: directional, color temp, saturation. */
function analyzeBackgroundLighting(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): LightingProfile {
  const neutral: LightingProfile = {
    r: 128, g: 128, b: 128, brightness: 128,
    leftR: 128, leftG: 128, leftB: 128, leftBright: 128,
    rightR: 128, rightG: 128, rightB: 128, rightBright: 128,
    topBright: 128, bottomBright: 128, warmth: 0, saturation: 0.3,
  };
  try {
    const data = ctx.getImageData(0, 0, width, height).data;
    const step = 12 * 4;
    const halfW = width / 2;
    const halfH = height / 2;

    let tR = 0, tG = 0, tB = 0, cnt = 0;
    let lR = 0, lG = 0, lB = 0, lCnt = 0;
    let rR = 0, rG = 0, rB = 0, rCnt = 0;
    let topB = 0, topCnt = 0, botB = 0, botCnt = 0;

    for (let i = 0; i < data.length; i += step) {
      const px = (i / 4) % width;
      const py = Math.floor((i / 4) / width);
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const br = 0.299 * r + 0.587 * g + 0.114 * b;
      tR += r; tG += g; tB += b; cnt++;

      if (px < halfW) { lR += r; lG += g; lB += b; lCnt++; }
      else { rR += r; rG += g; rB += b; rCnt++; }
      if (py < halfH) { topB += br; topCnt++; }
      else { botB += br; botCnt++; }
    }

    const avg = (v: number, c: number) => v / Math.max(1, c);
    const gR = avg(tR, cnt), gG = avg(tG, cnt), gB = avg(tB, cnt);
    const gBr = 0.299 * gR + 0.587 * gG + 0.114 * gB;

    // Warmth: positive = warm (red/yellow dominant), negative = cool (blue dominant)
    const warmth = ((gR - gB) / 255) * 2; // -2 to +2

    // Saturation estimate via max-min channel spread
    const maxC = Math.max(gR, gG, gB), minC = Math.min(gR, gG, gB);
    const saturation = maxC > 0 ? (maxC - minC) / maxC : 0;

    const lBr = 0.299 * avg(lR, lCnt) + 0.587 * avg(lG, lCnt) + 0.114 * avg(lB, lCnt);
    const rBr = 0.299 * avg(rR, rCnt) + 0.587 * avg(rG, rCnt) + 0.114 * avg(rB, rCnt);

    return {
      r: gR, g: gG, b: gB, brightness: gBr,
      leftR: avg(lR, lCnt), leftG: avg(lG, lCnt), leftB: avg(lB, lCnt), leftBright: lBr,
      rightR: avg(rR, rCnt), rightG: avg(rG, rCnt), rightB: avg(rB, rCnt), rightBright: rBr,
      topBright: avg(topB, topCnt), bottomBright: avg(botB, botCnt),
      warmth, saturation,
    };
  } catch {
    return neutral;
  }
}

/**
 * Dynamic lighting harmonization:
 * 1. Ambient color tint (stronger for saturated scenes)
 * 2. Directional lighting — left/right brightness difference creates gradient shading
 * 3. Top-down light direction — overhead vs underlit gradient
 * 4. Color temperature shift (warm orange or cool blue wash)
 * 5. Colored rim/edge light from dominant side
 * 6. Global brightness match
 */
function applyLightingMatch(
  ctx: CanvasRenderingContext2D,
  subX: number,
  subY: number,
  subW: number,
  subH: number,
  lighting: LightingProfile
) {
  const { r, g, b, brightness, warmth, saturation } = lighting;
  const brightnessFactor = brightness / 128;

  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';

  // 1. Ambient color tint — stronger when scene is more saturated
  const tintAlpha = 0.06 + saturation * 0.14; // 0.06–0.20
  ctx.globalAlpha = Math.min(0.22, tintAlpha);
  ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  ctx.fillRect(subX, subY, subW, subH);

  // 2. Directional side lighting — gradient shading based on L/R brightness diff
  const lrDiff = lighting.leftBright - lighting.rightBright; // positive = light from left
  const dirStrength = Math.min(0.18, Math.abs(lrDiff) / 400);
  if (Math.abs(lrDiff) > 15) {
    ctx.globalAlpha = dirStrength;
    const dirGrad = lrDiff > 0
      ? ctx.createLinearGradient(subX + subW, subY, subX, subY) // dark on right
      : ctx.createLinearGradient(subX, subY, subX + subW, subY); // dark on left
    dirGrad.addColorStop(0, 'rgb(0,0,0)');
    dirGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
    ctx.fillStyle = dirGrad;
    ctx.fillRect(subX, subY, subW, subH);
  }

  // 3. Top-down light direction
  const tbDiff = lighting.topBright - lighting.bottomBright;
  if (Math.abs(tbDiff) > 20) {
    ctx.globalAlpha = Math.min(0.12, Math.abs(tbDiff) / 500);
    const tbGrad = tbDiff > 0
      ? ctx.createLinearGradient(subX, subY + subH, subX, subY) // light from top, darken bottom
      : ctx.createLinearGradient(subX, subY, subX, subY + subH); // light from below, darken top
    tbGrad.addColorStop(0, 'rgb(0,0,0)');
    tbGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
    ctx.fillStyle = tbGrad;
    ctx.fillRect(subX, subY, subW, subH);
  }

  // 4. Color temperature shift — warm orange or cool blue wash
  if (Math.abs(warmth) > 0.15) {
    ctx.globalAlpha = Math.min(0.10, Math.abs(warmth) * 0.06);
    ctx.fillStyle = warmth > 0 ? 'rgb(255, 180, 80)' : 'rgb(100, 160, 255)';
    ctx.fillRect(subX, subY, subW, subH);
  }

  // 5. Colored rim light from the brighter side
  const rimSide = lighting.leftBright > lighting.rightBright ? 'left' : 'right';
  const rimColor = rimSide === 'left'
    ? `rgb(${Math.round(lighting.leftR)}, ${Math.round(lighting.leftG)}, ${Math.round(lighting.leftB)})`
    : `rgb(${Math.round(lighting.rightR)}, ${Math.round(lighting.rightG)}, ${Math.round(lighting.rightB)})`;
  ctx.globalAlpha = 0.10 + saturation * 0.06;

  if (rimSide === 'left') {
    const rimGrad = ctx.createLinearGradient(subX, subY, subX + subW * 0.18, subY);
    rimGrad.addColorStop(0, rimColor);
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
  } else {
    const rimGrad = ctx.createLinearGradient(subX + subW, subY, subX + subW * 0.82, subY);
    rimGrad.addColorStop(0, rimColor);
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
  }
  ctx.fillRect(subX, subY, subW, subH);

  // Opposite side gets a softer fill light
  const fillColor = rimSide === 'left'
    ? `rgb(${Math.round(lighting.rightR)}, ${Math.round(lighting.rightG)}, ${Math.round(lighting.rightB)})`
    : `rgb(${Math.round(lighting.leftR)}, ${Math.round(lighting.leftG)}, ${Math.round(lighting.leftB)})`;
  ctx.globalAlpha = 0.05;
  if (rimSide === 'left') {
    const fillGrad = ctx.createLinearGradient(subX + subW, subY, subX + subW * 0.85, subY);
    fillGrad.addColorStop(0, fillColor);
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fillGrad;
  } else {
    const fillGrad = ctx.createLinearGradient(subX, subY, subX + subW * 0.15, subY);
    fillGrad.addColorStop(0, fillColor);
    fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fillGrad;
  }
  ctx.fillRect(subX, subY, subW, subH);

  // 6. Global brightness match
  if (brightnessFactor < 0.80) {
    ctx.globalAlpha = Math.min(0.30, (1 - brightnessFactor) * 0.35);
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(subX, subY, subW, subH);
  } else if (brightnessFactor > 1.25) {
    ctx.globalAlpha = Math.min(0.18, (brightnessFactor - 1) * 0.22);
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(subX, subY, subW, subH);
  }

  ctx.restore();
}

/**
 * Analyze background scene to determine appropriate subject scale.
 * Uses edge density gradient (top-to-bottom) and brightness variance
 * to infer scene depth: wide landscapes → smaller subject, close walls → larger.
 * Returns a scale fraction (0.50 – 0.85) of canvas height.
 */
function analyzeSceneScale(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): { scaleFraction: number; groundY: number } {
  try {
    const sampleW = Math.min(width, 200);
    const sampleH = Math.min(height, 350);
    const offX = Math.floor((width - sampleW) / 2);
    const data = ctx.getImageData(offX, 0, sampleW, sampleH).data;

    // Divide into vertical bands and measure edge density + brightness
    const bands = 7;
    const bandH = Math.floor(sampleH / bands);
    const bandEdge: number[] = [];
    const bandBright: number[] = [];

    for (let b = 0; b < bands; b++) {
      let edges = 0, bright = 0, count = 0;
      const yStart = b * bandH;
      for (let y = yStart; y < yStart + bandH; y += 2) {
        for (let x = 2; x < sampleW - 2; x += 4) {
          const i = (y * sampleW + x) * 4;
          const iLeft = (y * sampleW + (x - 2)) * 4;
          const diff = Math.abs(data[i] - data[iLeft]) +
                       Math.abs(data[i + 1] - data[iLeft + 1]) +
                       Math.abs(data[i + 2] - data[iLeft + 2]);
          edges += diff;
          bright += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          count++;
        }
      }
      bandEdge.push(edges / Math.max(1, count));
      bandBright.push(bright / Math.max(1, count));
    }

    // Heuristic 1: Edge increase bottom-to-top ratio → depth cue
    const topEdge = (bandEdge[0] + bandEdge[1]) / 2;
    const bottomEdge = (bandEdge[bands - 2] + bandEdge[bands - 1]) / 2;
    const edgeRatio = topEdge / Math.max(1, bottomEdge); // >1 = landscape, <1 = close wall

    // Heuristic 2: Brightness variance across bands → depth diversity
    const avgBright = bandBright.reduce((a, b) => a + b, 0) / bands;
    const variance = bandBright.reduce((a, b) => a + (b - avgBright) ** 2, 0) / bands;
    const normalizedVar = Math.min(variance / 2000, 1); // 0-1

    // Combine: high edge ratio + high variance = deep scene (smaller subject)
    const depthScore = Math.min(1, edgeRatio * 0.5 + normalizedVar * 0.5);

    // Map depthScore → scale: 0 (close) → 0.82, 1 (deep landscape) → 0.55
    const scaleFraction = 0.82 - depthScore * 0.27;

    // Estimate ground position: find where bottom brightness stabilizes
    // Default to 95% height (small gap at bottom)
    const groundY = height * (0.97 - depthScore * 0.05);

    return { scaleFraction: Math.max(0.50, Math.min(0.85, scaleFraction)), groundY };
  } catch {
    return { scaleFraction: 0.80, groundY: height * 0.95 };
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  bgImg: HTMLImageElement | null,
  backgroundColor: string,
  width: number,
  height: number
) {
  if (bgImg) {
    const bgRatio = bgImg.width / bgImg.height;
    const canvasRatio = width / height;
    let sx = 0, sy = 0, sw = bgImg.width, sh = bgImg.height;
    if (bgRatio > canvasRatio) {
      sw = bgImg.height * canvasRatio;
      sx = (bgImg.width - sw) / 2;
    } else {
      sh = bgImg.width / canvasRatio;
      sy = (bgImg.height - sh) / 2;
    }
    ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
  } else {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 10, g: 10, b: 10 };
}

export function useCanvasCompositor() {
  const composite = useCallback(async (options: CompositeOptions): Promise<string> => {
    const { subjectUrl, backgroundUrl, backgroundColor = '#0A0A0A', width = 1080, height = 1920, addWatermark = false, scaleOverride = null } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Draw background
    let bgImg: HTMLImageElement | null = null;
    if (backgroundUrl) {
      bgImg = await loadImage(backgroundUrl);
    }
    drawBackground(ctx, bgImg, backgroundColor, width, height);

    // Analyze scene scale (use override if provided)
    const auto = bgImg
      ? analyzeSceneScale(ctx, width, height)
      : { scaleFraction: 0.80, groundY: height * 0.95 };
    const finalScale = scaleOverride != null ? scaleOverride : auto.scaleFraction;
    const groundY = auto.groundY;

    // Analyze background lighting
    const lighting = bgImg
      ? analyzeBackgroundLighting(ctx, width, height)
      : (() => { const c = hexToRgb(backgroundColor); return { ...c, brightness: 0.299 * c.r + 0.587 * c.g + 0.114 * c.b }; })();

    // Draw subject (scene-aware scale, anchored to ground)
    const subjectImg = await loadImage(subjectUrl);
    const scale = (height * finalScale) / subjectImg.height;
    const subW = subjectImg.width * scale;
    const subH = subjectImg.height * scale;
    const subX = (width - subW) / 2;
    const subY = groundY - subH;

    // Soft shadow beneath subject
    ctx.save();
    ctx.filter = 'blur(20px)';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(subjectImg, subX + 10, subY + 20, subW, subH);
    ctx.restore();

    // Draw actual subject
    ctx.drawImage(subjectImg, subX, subY, subW, subH);

    // Apply lighting harmonization
    applyLightingMatch(ctx, subX, subY, subW, subH, lighting);

    // Optional watermark
    if (addWatermark) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.5;
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#D4AF37';
      ctx.textAlign = 'right';
      ctx.fillText('👑 DripFit', width - 30, height - 30);
      ctx.restore();
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  }, []);

  const compositePreview = useCallback(async (
    canvas: HTMLCanvasElement,
    subjectUrl: string,
    backgroundUrl: string | null,
    backgroundColor: string = '#0A0A0A',
    scaleOverride: number | null = null
  ): Promise<void> => {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Draw background
    let bgImg: HTMLImageElement | null = null;
    if (backgroundUrl) {
      try {
        bgImg = await loadImage(backgroundUrl);
      } catch {
        // fallback to solid
      }
    }
    drawBackground(ctx, bgImg, backgroundColor, width, height);

    // Analyze scene scale (use override if provided)
    const auto = bgImg
      ? analyzeSceneScale(ctx, width, height)
      : { scaleFraction: 0.80, groundY: height * 0.95 };
    const finalScale = scaleOverride != null ? scaleOverride : auto.scaleFraction;
    const groundY = auto.groundY;

    // Analyze background lighting
    const lighting = bgImg
      ? analyzeBackgroundLighting(ctx, width, height)
      : (() => { const c = hexToRgb(backgroundColor); return { ...c, brightness: 0.299 * c.r + 0.587 * c.g + 0.114 * c.b }; })();

    // Draw subject (scene-aware scale)
    try {
      const subjectImg = await loadImage(subjectUrl);
      const scale = (height * finalScale) / subjectImg.height;
      const subW = subjectImg.width * scale;
      const subH = subjectImg.height * scale;
      const subX = (width - subW) / 2;
      const subY = groundY - subH;

      // Shadow
      ctx.save();
      ctx.filter = 'blur(12px)';
      ctx.globalAlpha = 0.2;
      ctx.drawImage(subjectImg, subX + 5, subY + 10, subW, subH);
      ctx.restore();

      // Subject
      ctx.drawImage(subjectImg, subX, subY, subW, subH);

      // Apply lighting harmonization
      applyLightingMatch(ctx, subX, subY, subW, subH, lighting);
    } catch {
      // Subject not ready yet
    }
  }, []);

  return { composite, compositePreview };
}
