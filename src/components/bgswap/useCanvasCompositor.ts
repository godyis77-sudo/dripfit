import { useCallback } from 'react';

interface CompositeOptions {
  subjectUrl: string;
  backgroundUrl: string | null;
  backgroundColor?: string;
  width?: number;
  height?: number;
  addWatermark?: boolean;
  scaleOverride?: number | null;
  offsetX?: number; // -1 to 1 (0 = centered)
  offsetY?: number; // -1 to 1 (0 = auto ground)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for http(s) URLs — blob: and data: URLs fail with CORS
    if (src.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
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
  // Floor-level color (bottom 15% of image)
  floorR: number; floorG: number; floorB: number; floorBright: number;
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
    floorR: 128, floorG: 128, floorB: 128, floorBright: 128,
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
    let fR = 0, fG = 0, fB = 0, fCnt = 0;
    const floorThreshold = height * 0.85; // bottom 15%

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
      if (py >= floorThreshold) { fR += r; fG += g; fB += b; fCnt++; }
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

    const flrR = avg(fR, fCnt), flrG = avg(fG, fCnt), flrB = avg(fB, fCnt);
    const flrBr = 0.299 * flrR + 0.587 * flrG + 0.114 * flrB;

    return {
      r: gR, g: gG, b: gB, brightness: gBr,
      leftR: avg(lR, lCnt), leftG: avg(lG, lCnt), leftB: avg(lB, lCnt), leftBright: lBr,
      rightR: avg(rR, rCnt), rightG: avg(rG, rCnt), rightB: avg(rB, rCnt), rightBright: rBr,
      topBright: avg(topB, topCnt), bottomBright: avg(botB, botCnt),
      warmth, saturation,
      floorR: flrR, floorG: flrG, floorB: flrB, floorBright: flrBr,
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

  // --- 1. Soft ambient color wash using 'multiply' for natural blending ---
  // Multiply darkens naturally — use a lightened version of the scene color
  const ambientR = Math.round(128 + (r - 128) * 0.4);
  const ambientG = Math.round(128 + (g - 128) * 0.4);
  const ambientB = Math.round(128 + (b - 128) * 0.4);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.08 + saturation * 0.10; // 0.08–0.18
  ctx.fillStyle = `rgb(${ambientR}, ${ambientG}, ${ambientB})`;
  ctx.fillRect(subX, subY, subW, subH);

  // --- 2. Overlay pass for mid-tone color integration ---
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.04 + saturation * 0.06; // very subtle 0.04–0.10
  ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  ctx.fillRect(subX, subY, subW, subH);

  // Switch back to source-atop for remaining passes
  ctx.globalCompositeOperation = 'source-atop';

  // --- 3. Directional side lighting — smooth gradient from brighter side ---
  const lrDiff = lighting.leftBright - lighting.rightBright;
  const dirStrength = Math.min(0.14, Math.abs(lrDiff) / 500);
  if (Math.abs(lrDiff) > 12) {
    ctx.globalAlpha = dirStrength;
    // Bright side gets a soft colored highlight, dark side gets shadow
    const brightSideColor = lrDiff > 0
      ? `rgba(${Math.round(lighting.leftR)}, ${Math.round(lighting.leftG)}, ${Math.round(lighting.leftB)}, 0.5)`
      : `rgba(${Math.round(lighting.rightR)}, ${Math.round(lighting.rightG)}, ${Math.round(lighting.rightB)}, 0.5)`;
    const dirGrad = lrDiff > 0
      ? ctx.createLinearGradient(subX, subY, subX + subW, subY)
      : ctx.createLinearGradient(subX + subW, subY, subX, subY);
    dirGrad.addColorStop(0, brightSideColor);
    dirGrad.addColorStop(0.35, 'rgba(0,0,0,0)');
    dirGrad.addColorStop(0.65, 'rgba(0,0,0,0)');
    dirGrad.addColorStop(1, `rgba(0,0,0,0.4)`);
    ctx.fillStyle = dirGrad;
    ctx.fillRect(subX, subY, subW, subH);
  }

  // --- 4. Top-down light gradient (overhead vs underlit) ---
  const tbDiff = lighting.topBright - lighting.bottomBright;
  if (Math.abs(tbDiff) > 15) {
    ctx.globalAlpha = Math.min(0.10, Math.abs(tbDiff) / 600);
    const tbGrad = tbDiff > 0
      ? ctx.createLinearGradient(subX, subY, subX, subY + subH)
      : ctx.createLinearGradient(subX, subY + subH, subX, subY);
    tbGrad.addColorStop(0, `rgba(255,255,255,0.3)`);
    tbGrad.addColorStop(0.4, 'rgba(0,0,0,0)');
    tbGrad.addColorStop(1, `rgba(0,0,0,0.3)`);
    ctx.fillStyle = tbGrad;
    ctx.fillRect(subX, subY, subW, subH);
  }

  // --- 5. Color temperature shift — warm or cool wash ---
  if (Math.abs(warmth) > 0.12) {
    ctx.globalAlpha = Math.min(0.07, Math.abs(warmth) * 0.04);
    ctx.fillStyle = warmth > 0
      ? `rgb(255, 200, 120)` // warm golden
      : `rgb(120, 170, 255)`; // cool blue
    ctx.fillRect(subX, subY, subW, subH);
  }

  // --- 6. Colored rim/edge light from dominant side ---
  const rimSide = lighting.leftBright > lighting.rightBright ? 'left' : 'right';
  const rimR = rimSide === 'left' ? lighting.leftR : lighting.rightR;
  const rimG = rimSide === 'left' ? lighting.leftG : lighting.rightG;
  const rimB = rimSide === 'left' ? lighting.leftB : lighting.rightB;
  ctx.globalAlpha = 0.06 + saturation * 0.05; // softer rim 0.06–0.11

  const rimEdge = rimSide === 'left' ? subX : subX + subW;
  const rimInner = rimSide === 'left' ? subX + subW * 0.12 : subX + subW * 0.88;
  const rimGrad = ctx.createLinearGradient(rimEdge, subY, rimInner, subY);
  rimGrad.addColorStop(0, `rgb(${Math.round(rimR)}, ${Math.round(rimG)}, ${Math.round(rimB)})`);
  rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(subX, subY, subW, subH);

  // Opposite side softer fill light
  const fillEdge = rimSide === 'left' ? subX + subW : subX;
  const fillInner = rimSide === 'left' ? subX + subW * 0.90 : subX + subW * 0.10;
  const fillR = rimSide === 'left' ? lighting.rightR : lighting.leftR;
  const fillG = rimSide === 'left' ? lighting.rightG : lighting.leftG;
  const fillB = rimSide === 'left' ? lighting.rightB : lighting.leftB;
  ctx.globalAlpha = 0.03;
  const fillGrad = ctx.createLinearGradient(fillEdge, subY, fillInner, subY);
  fillGrad.addColorStop(0, `rgb(${Math.round(fillR)}, ${Math.round(fillG)}, ${Math.round(fillB)})`);
  fillGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fillGrad;
  ctx.fillRect(subX, subY, subW, subH);

  // --- 7. Global brightness match (darken or brighten to match scene) ---
  if (brightnessFactor < 0.82) {
    ctx.globalAlpha = Math.min(0.25, (1 - brightnessFactor) * 0.30);
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(subX, subY, subW, subH);
  } else if (brightnessFactor > 1.20) {
    ctx.globalAlpha = Math.min(0.14, (brightnessFactor - 1) * 0.18);
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(subX, subY, subW, subH);
  }

  // --- 8. Floor-level color blending — feathered ground transition ---
  const floorColor = `rgb(${Math.round(lighting.floorR)}, ${Math.round(lighting.floorG)}, ${Math.round(lighting.floorB)})`;
  const floorBlendStart = subY + subH * 0.75; // start at 75% (gentler)
  const floorGrad = ctx.createLinearGradient(subX, floorBlendStart, subX, subY + subH);
  floorGrad.addColorStop(0, 'rgba(0,0,0,0)');
  floorGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
  floorGrad.addColorStop(1, floorColor);
  ctx.globalAlpha = 0.12 + lighting.saturation * 0.06; // softer: 0.12–0.18
  ctx.fillStyle = floorGrad;
  ctx.fillRect(subX, floorBlendStart, subW, subH * 0.25);

  // --- 9. Floor brightness match — subtle luminance correction at feet ---
  const floorBrightDiff = lighting.floorBright - lighting.brightness;
  if (Math.abs(floorBrightDiff) > 20) {
    const fbGrad = ctx.createLinearGradient(subX, floorBlendStart, subX, subY + subH);
    fbGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fbGrad.addColorStop(0.6, 'rgba(0,0,0,0)');
    fbGrad.addColorStop(1, floorBrightDiff < 0 ? 'rgb(0,0,0)' : 'rgb(255,255,255)');
    ctx.globalAlpha = Math.min(0.12, Math.abs(floorBrightDiff) / 500);
    ctx.fillStyle = fbGrad;
    ctx.fillRect(subX, floorBlendStart, subW, subH * 0.25);
  }

  // --- 10. Environment bounce light — upward glow from floor onto lower body ---
  const bounceStart = subY + subH * 0.55;
  const bounceGrad = ctx.createLinearGradient(subX, subY + subH, subX, bounceStart);
  bounceGrad.addColorStop(0, floorColor);
  bounceGrad.addColorStop(0.3, `rgba(${Math.round(lighting.floorR)}, ${Math.round(lighting.floorG)}, ${Math.round(lighting.floorB)}, 0.3)`);
  bounceGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.05 + saturation * 0.03; // very subtle 0.05–0.08
  ctx.fillStyle = bounceGrad;
  ctx.fillRect(subX, bounceStart, subW, subH * 0.45);

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
    const { subjectUrl, backgroundUrl, backgroundColor = '#0A0A0A', width = 1080, height = 1920, addWatermark = false, scaleOverride = null, offsetX = 0, offsetY = 0 } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    let bgImg: HTMLImageElement | null = null;
    if (backgroundUrl) {
      bgImg = await loadImage(backgroundUrl);
    }
    drawBackground(ctx, bgImg, backgroundColor, width, height);

    const auto = bgImg
      ? analyzeSceneScale(ctx, width, height)
      : { scaleFraction: 0.80, groundY: height * 0.95 };
    const finalScale = scaleOverride != null ? scaleOverride : auto.scaleFraction;
    const groundY = auto.groundY;

    const lighting = bgImg
      ? analyzeBackgroundLighting(ctx, width, height)
      : (() => { const c = hexToRgb(backgroundColor); const br = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; return { ...c, brightness: br, leftR: c.r, leftG: c.g, leftB: c.b, leftBright: br, rightR: c.r, rightG: c.g, rightB: c.b, rightBright: br, topBright: br, bottomBright: br, warmth: 0, saturation: 0, floorR: c.r, floorG: c.g, floorB: c.b, floorBright: br } as LightingProfile; })();

    const subjectImg = await loadImage(subjectUrl);
    const scale = (height * finalScale) / subjectImg.height;
    const subW = subjectImg.width * scale;
    const subH = subjectImg.height * scale;
    const subX = (width - subW) / 2 + offsetX * (width * 0.4);
    const subY = groundY - subH + offsetY * (height * 0.4);

    // Dynamic shadow based on lighting direction
    const lrDiff = lighting.leftBright - lighting.rightBright;
    const tbDiff = lighting.topBright - lighting.bottomBright;
    const shadowOffsetX = Math.round((-lrDiff / 255) * 25);
    const shadowOffsetY = Math.max(6, Math.round((tbDiff / 255) * 20 + 12));
    const shadowAlpha = Math.min(0.35, 0.12 + (lighting.brightness / 255) * 0.18);
    // Shadow tinted with floor color for realism
    const shR = Math.round(lighting.floorR * 0.3);
    const shG = Math.round(lighting.floorG * 0.3);
    const shB = Math.round(lighting.floorB * 0.3);

    // Ambient occlusion — very soft, wide dark area under feet
    ctx.save();
    const aoY = subY + subH;
    const aoCX = subX + subW / 2;
    const aoW = subW * 0.8;
    const aoH = subH * 0.025;
    ctx.beginPath();
    ctx.ellipse(aoCX, aoY + 2, aoW / 2, aoH * 3, 0, 0, Math.PI * 2);
    const aoGrad = ctx.createRadialGradient(aoCX, aoY + 2, 0, aoCX, aoY + 2, aoW / 2);
    aoGrad.addColorStop(0, `rgba(${shR},${shG},${shB},${shadowAlpha * 0.3})`);
    aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aoGrad;
    ctx.fill();
    ctx.restore();

    // Ground contact shadow (tight ellipse at feet)
    ctx.save();
    const footY = subY + subH;
    const footCenterX = subX + subW / 2 + shadowOffsetX * 0.4;
    const ellipseW = subW * 0.5;
    const ellipseH = subH * 0.03;
    ctx.beginPath();
    ctx.ellipse(footCenterX, footY, ellipseW / 2, ellipseH, 0, 0, Math.PI * 2);
    const contactGrad = ctx.createRadialGradient(footCenterX, footY, 0, footCenterX, footY, ellipseW / 2);
    contactGrad.addColorStop(0, `rgba(${shR},${shG},${shB},${shadowAlpha * 0.9})`);
    contactGrad.addColorStop(0.5, `rgba(${shR},${shG},${shB},${shadowAlpha * 0.35})`);
    contactGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = contactGrad;
    ctx.fill();
    ctx.restore();

    // Directional drop shadow (blurred, offset, color-tinted)
    ctx.save();
    ctx.filter = `blur(${Math.round(14 + shadowOffsetY * 0.4)}px)`;
    ctx.globalAlpha = shadowAlpha * 0.45;
    ctx.drawImage(subjectImg, subX + shadowOffsetX, subY + shadowOffsetY * 0.8, subW, subH);
    ctx.restore();

    // Draw actual subject
    ctx.drawImage(subjectImg, subX, subY, subW, subH);

    // Apply lighting harmonization
    applyLightingMatch(ctx, subX, subY, subW, subH, lighting);

    // Specular highlight — soft bright edge on the light-facing top/side
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const specSide = lrDiff > 0 ? 'left' : 'right';
    const specX = specSide === 'left' ? subX : subX + subW * 0.85;
    const specW = subW * 0.15;
    const specGrad = ctx.createLinearGradient(
      specSide === 'left' ? specX : specX + specW,
      subY,
      specSide === 'left' ? specX + specW : specX,
      subY
    );
    specGrad.addColorStop(0, `rgba(255,255,255,0.12)`);
    specGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = Math.min(0.10, Math.abs(lrDiff) / 400 + 0.02);
    ctx.fillStyle = specGrad;
    ctx.fillRect(specX, subY, specW, subH * 0.4);

    // Top-edge highlight (overhead light catch)
    if (tbDiff > 20) {
      const topGrad = ctx.createLinearGradient(subX, subY, subX, subY + subH * 0.08);
      topGrad.addColorStop(0, `rgba(255,255,255,0.10)`);
      topGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = Math.min(0.08, tbDiff / 600);
      ctx.fillStyle = topGrad;
      ctx.fillRect(subX, subY, subW, subH * 0.08);
    }
    ctx.restore();

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
    scaleOverride: number | null = null,
    offsetX: number = 0,
    offsetY: number = 0
  ): Promise<void> => {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    let bgImg: HTMLImageElement | null = null;
    if (backgroundUrl) {
      try { bgImg = await loadImage(backgroundUrl); } catch { /* fallback */ }
    }
    drawBackground(ctx, bgImg, backgroundColor, width, height);

    const auto = bgImg
      ? analyzeSceneScale(ctx, width, height)
      : { scaleFraction: 0.80, groundY: height * 0.95 };
    const finalScale = scaleOverride != null ? scaleOverride : auto.scaleFraction;
    const groundY = auto.groundY;

    const lighting = bgImg
      ? analyzeBackgroundLighting(ctx, width, height)
      : (() => { const c = hexToRgb(backgroundColor); const br = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; return { ...c, brightness: br, leftR: c.r, leftG: c.g, leftB: c.b, leftBright: br, rightR: c.r, rightG: c.g, rightB: c.b, rightBright: br, topBright: br, bottomBright: br, warmth: 0, saturation: 0, floorR: c.r, floorG: c.g, floorB: c.b, floorBright: br } as LightingProfile; })();

    try {
      const subjectImg = await loadImage(subjectUrl);
      const scale = (height * finalScale) / subjectImg.height;
      const subW = subjectImg.width * scale;
      const subH = subjectImg.height * scale;
      const subX = (width - subW) / 2 + offsetX * (width * 0.4);
      const subY = groundY - subH + offsetY * (height * 0.4);

      // Dynamic shadow based on lighting direction
      const lrDiff = lighting.leftBright - lighting.rightBright;
      const tbDiff = lighting.topBright - lighting.bottomBright;
      const shadowOffsetX = Math.round((-lrDiff / 255) * 30);
      const shadowOffsetY = Math.max(8, Math.round((tbDiff / 255) * 25 + 15));
      const shadowAlpha = Math.min(0.4, 0.15 + (lighting.brightness / 255) * 0.2);

      // Ground contact shadow
      ctx.save();
      const footY = subY + subH;
      const footCenterX = subX + subW / 2 + shadowOffsetX * 0.5;
      const ellipseW = subW * 0.6;
      const ellipseH = subH * 0.04;
      ctx.beginPath();
      ctx.ellipse(footCenterX, footY, ellipseW / 2, ellipseH, 0, 0, Math.PI * 2);
      const contactGrad = ctx.createRadialGradient(footCenterX, footY, 0, footCenterX, footY, ellipseW / 2);
      contactGrad.addColorStop(0, `rgba(0,0,0,${shadowAlpha * 0.8})`);
      contactGrad.addColorStop(0.6, `rgba(0,0,0,${shadowAlpha * 0.3})`);
      contactGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = contactGrad;
      ctx.fill();
      ctx.restore();

      // Directional drop shadow
      ctx.save();
      ctx.filter = `blur(${Math.round(12 + shadowOffsetY * 0.4)}px)`;
      ctx.globalAlpha = shadowAlpha * 0.5;
      ctx.drawImage(subjectImg, subX + shadowOffsetX, subY + shadowOffsetY, subW, subH);
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
