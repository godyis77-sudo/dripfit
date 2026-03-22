import { useState, useCallback } from 'react';

export function useBackgroundRemoval() {
  const [removing, setRemoving] = useState(false);
  const [progress, setProgress] = useState(0);

  const removeBackground = useCallback(async (imageUrl: string): Promise<string> => {
    setRemoving(true);
    setProgress(5);
    try {
      const { removeBackground: removeBg } = await import('@imgly/background-removal');
      
      // Track progress across all keys
      const keyProgress = new Map<string, number>();
      
      const blob = await removeBg(imageUrl, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            keyProgress.set(key, current / total);
            // Average progress across all tracked keys
            const values = Array.from(keyProgress.values());
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            setProgress(Math.max(5, Math.min(99, Math.round(avg * 100))));
          }
        },
        output: { format: 'image/png' as any },
      });

      const resultBlob = blob instanceof Blob ? blob : new Blob([blob], { type: 'image/png' });
      const url = URL.createObjectURL(resultBlob);
      setProgress(100);
      return url;
    } finally {
      setRemoving(false);
    }
  }, []);

  return { removeBackground, removing, progress };
}
