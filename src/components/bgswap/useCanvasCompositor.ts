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

/** Sample a background image and return average RGB + perceived brightness (0-255). */
function analyzeBackgroundLighting(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): { r: number; g: number; b: number; brightness: number } {
  try {
    // Sample a vertical strip in the center (where the subject will be)
    const sampleX = Math.floor(width * 0.25);
    const sampleW = Math.floor(width * 0.5);
    const sampleH = height;
    const imageData = ctx.getImageData(sampleX, 0, sampleW, sampleH);
    const data = imageData.data;

    let totalR = 0, totalG = 0, totalB = 0;
    // Sample every 16th pixel for performance
    const step = 16 * 4;
    let count = 0;
    for (let i = 0; i < data.length; i += step) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      count++;
    }

    const r = totalR / Math.max(1, count);
    const g = totalG / Math.max(1, count);
    const b = totalB / Math.max(1, count);
    // Perceived brightness (ITU-R BT.601)
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    return { r, g, b, brightness };
  } catch {
    // Cross-origin images can taint canvas and block pixel reads.
    // Fall back to neutral lighting so compositing never crashes.
    return { r: 128, g: 128, b: 128, brightness: 128 };
  }
}

/**
 * Apply lighting harmonization to the subject area:
 * 1. Color tint overlay (multiply blend) to match the scene's ambient color
 * 2. Brightness adjustment via luminosity overlay
 * 3. Subtle ambient light from the background edges
 */
function applyLightingMatch(
  ctx: CanvasRenderingContext2D,
  subX: number,
  subY: number,
  subW: number,
  subH: number,
  lighting: { r: number; g: number; b: number; brightness: number }
) {
  const { r, g, b, brightness } = lighting;

  // Normalize brightness: 128 = neutral, <128 = darken, >128 = brighten
  const brightnessFactor = brightness / 128; // 0-2 range

  ctx.save();

  // 1. Color tint — soft multiply-style overlay matching background hue
  //    Use very low opacity so it tints without overpowering
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  ctx.fillRect(subX, subY, subW, subH);

  // 2. Brightness correction
  if (brightnessFactor < 0.85) {
    // Dark background → darken subject slightly
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = Math.min(0.25, (1 - brightnessFactor) * 0.3);
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(subX, subY, subW, subH);
  } else if (brightnessFactor > 1.3) {
    // Bright background → brighten subject slightly
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = Math.min(0.15, (brightnessFactor - 1) * 0.2);
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(subX, subY, subW, subH);
  }

  // 3. Ambient rim light on edges — gradient from background color
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = 0.08;
  const rimLeft = ctx.createLinearGradient(subX, subY, subX + subW * 0.15, subY);
  rimLeft.addColorStop(0, `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`);
  rimLeft.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rimLeft;
  ctx.fillRect(subX, subY, subW, subH);

  const rimRight = ctx.createLinearGradient(subX + subW, subY, subX + subW * 0.85, subY);
  rimRight.addColorStop(0, `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`);
  rimRight.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rimRight;
  ctx.fillRect(subX, subY, subW, subH);

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

    // Analyze scene scale
    const { scaleFraction, groundY } = bgImg
      ? analyzeSceneScale(ctx, width, height)
      : { scaleFraction: 0.80, groundY: height * 0.95 };

    // Analyze background lighting
    const lighting = bgImg
      ? analyzeBackgroundLighting(ctx, width, height)
      : (() => { const c = hexToRgb(backgroundColor); return { ...c, brightness: 0.299 * c.r + 0.587 * c.g + 0.114 * c.b }; })();

    // Draw subject (scene-aware scale, anchored to ground)
    const subjectImg = await loadImage(subjectUrl);
    const scale = (height * scaleFraction) / subjectImg.height;
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
    backgroundColor: string = '#0A0A0A'
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

    // Analyze scene scale
    const { scaleFraction, groundY } = bgImg
      ? analyzeSceneScale(ctx, width, height)
      : { scaleFraction: 0.80, groundY: height * 0.95 };

    // Analyze background lighting
    const lighting = bgImg
      ? analyzeBackgroundLighting(ctx, width, height)
      : (() => { const c = hexToRgb(backgroundColor); return { ...c, brightness: 0.299 * c.r + 0.587 * c.g + 0.114 * c.b }; })();

    // Draw subject (scene-aware scale)
    try {
      const subjectImg = await loadImage(subjectUrl);
      const scale = (height * scaleFraction) / subjectImg.height;
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
