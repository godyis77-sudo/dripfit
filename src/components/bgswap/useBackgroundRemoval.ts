import { useState, useCallback } from 'react';

export function useBackgroundRemoval() {
  const [removing, setRemoving] = useState(false);
  const [progress, setProgress] = useState(0);

  const removeBackground = useCallback(async (imageUrl: string): Promise<string> => {
    setRemoving(true);
    setProgress(0);
    try {
      const { removeBackground: removeBg } = await import('@imgly/background-removal');
      const blob = await removeBg(imageUrl, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) setProgress(Math.round((current / total) * 100));
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
