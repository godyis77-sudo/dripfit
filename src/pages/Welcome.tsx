import { useState, useEffect } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BottomTabBar from '@/components/BottomTabBar';
import GalleryPlayground from '@/components/home/GalleryPlayground';
import AuthenticatedHome from '@/components/home/AuthenticatedHome';

/** Check PostHog feature flag (async, defaults to true) */
function useFeatureFlag(flag: string, defaultValue = true): boolean {
  const [enabled, setEnabled] = useState(defaultValue);

  useEffect(() => {
    let cancelled = false;
    import('posthog-js').then((mod) => {
      if (cancelled) return;
      const posthog = mod.default;
      // PostHog may not be ready immediately — check with callback
      const value = posthog.isFeatureEnabled(flag);
      if (typeof value === 'boolean') {
        setEnabled(value);
      } else {
        // Flag not loaded yet — listen for ready
        posthog.onFeatureFlags(() => {
          if (cancelled) return;
          const v = posthog.isFeatureEnabled(flag);
          if (typeof v === 'boolean') setEnabled(v);
        });
      }
    }).catch(() => {
      // PostHog unavailable — keep default
    });
    return () => { cancelled = true; };
  }, [flag]);

  return enabled;
}

const Welcome = () => {
  usePageMeta({ path: '/home' });
  const galleryEnabled = useFeatureFlag('gallery_playground_enabled', true);

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      {galleryEnabled ? <GalleryPlayground /> : <AuthenticatedHome />}
      <BottomTabBar />
    </div>
  );
};

export default Welcome;
