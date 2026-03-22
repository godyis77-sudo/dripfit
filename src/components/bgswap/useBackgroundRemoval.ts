import { useState, useCallback } from 'react';

const ATTEMPT_MAX_EDGES = [1600, 1280, 960, 720] as const;

const MEMORY_ERROR_PATTERNS = [
  'memory',
  'out of memory',
  'out of bounds',
  'allocation',
  'cannot enlarge memory arrays',
  'abort',
];

function looksLikeMemoryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return MEMORY_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

async function fetchSourceBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Source image fetch failed (${response.status})`);
  }
  return response.blob();
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image'));
    };
    img.src = objectUrl;
  });
}

async function resizeBlobIfNeeded(blob: Blob, maxEdge: number): Promise<Blob> {
  const img = await blobToImage(blob);
  const longestEdge = Math.max(img.naturalWidth, img.naturalHeight);

  if (!longestEdge || longestEdge <= maxEdge) {
    return blob;
  }

  const scale = maxEdge / longestEdge;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create canvas context');

  ctx.drawImage(img, 0, 0, width, height);

  const resized = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) resolve(nextBlob);
      else reject(new Error('Failed to prepare resized image'));
    }, 'image/png');
  });

  return resized;
}

export function useBackgroundRemoval() {
  const [removing, setRemoving] = useState(false);
  const [progress, setProgress] = useState(0);

  const removeBackground = useCallback(async (imageUrl: string): Promise<string> => {
    setRemoving(true);
    setProgress(5);

    try {
      const { removeBackground: removeBg } = await import('@imgly/background-removal');
      const sourceBlob = await fetchSourceBlob(imageUrl);
      let lastError: unknown = null;

      for (let i = 0; i < ATTEMPT_MAX_EDGES.length; i += 1) {
        const maxEdge = ATTEMPT_MAX_EDGES[i];
        const baseProgress = 5 + Math.round((i / ATTEMPT_MAX_EDGES.length) * 70);
        setProgress(baseProgress);

        try {
          const candidateBlob = await resizeBlobIfNeeded(sourceBlob, maxEdge);
          const keyProgress = new Map<string, number>();

          const blob = await removeBg(candidateBlob, {
            progress: (key: string, current: number, total: number) => {
              if (total <= 0) return;
              keyProgress.set(key, current / total);
              const values = Array.from(keyProgress.values());
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              const attemptSpan = 25;
              const attemptProgress = Math.round(avg * attemptSpan);
              setProgress(Math.max(baseProgress, Math.min(99, baseProgress + attemptProgress)));
            },
            output: { format: 'image/png' as any },
          });

          const resultBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'image/png' });
          const url = URL.createObjectURL(resultBlob);
          setProgress(100);
          return url;
        } catch (error) {
          lastError = error;
          console.warn(`[bg-remove] attempt ${i + 1}/${ATTEMPT_MAX_EDGES.length} failed at maxEdge=${maxEdge}`, error);

          if (!looksLikeMemoryError(error)) {
            break;
          }
        }
      }

      throw lastError ?? new Error('Background removal failed');
    } finally {
      setRemoving(false);
    }
  }, []);

  return { removeBackground, removing, progress };
}
