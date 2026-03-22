import { useCallback } from 'react';

interface CompositeOptions {
  subjectUrl: string;
  backgroundUrl: string | null; // null = solid color
  backgroundColor?: string;
  width?: number;
  height?: number;
  addWatermark?: boolean;
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

export function useCanvasCompositor() {
  const composite = useCallback(async (options: CompositeOptions): Promise<string> => {
    const { subjectUrl, backgroundUrl, backgroundColor = '#0A0A0A', width = 1080, height = 1920, addWatermark = false } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Draw background
    if (backgroundUrl) {
      const bgImg = await loadImage(backgroundUrl);
      // Cover fill
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

    // Draw subject (centered, scaled to 80% height, anchored to bottom)
    const subjectImg = await loadImage(subjectUrl);
    const scale = (height * 0.8) / subjectImg.height;
    const subW = subjectImg.width * scale;
    const subH = subjectImg.height * scale;
    const subX = (width - subW) / 2;
    const subY = height - subH - 100;

    // Soft shadow beneath subject
    ctx.save();
    ctx.filter = 'blur(20px)';
    ctx.globalAlpha = 0.25;
    ctx.drawImage(subjectImg, subX + 10, subY + 20, subW, subH);
    ctx.restore();

    // Draw actual subject
    ctx.drawImage(subjectImg, subX, subY, subW, subH);

    // Optional watermark
    if (addWatermark) {
      ctx.save();
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
    if (backgroundUrl) {
      try {
        const bgImg = await loadImage(backgroundUrl);
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
      } catch {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw subject
    try {
      const subjectImg = await loadImage(subjectUrl);
      const scale = (height * 0.8) / subjectImg.height;
      const subW = subjectImg.width * scale;
      const subH = subjectImg.height * scale;
      const subX = (width - subW) / 2;
      const subY = height - subH - (height * 0.05);

      // Shadow
      ctx.save();
      ctx.filter = 'blur(12px)';
      ctx.globalAlpha = 0.2;
      ctx.drawImage(subjectImg, subX + 5, subY + 10, subW, subH);
      ctx.restore();

      ctx.drawImage(subjectImg, subX, subY, subW, subH);
    } catch {
      // Subject not ready yet
    }
  }, []);

  return { composite, compositePreview };
}
