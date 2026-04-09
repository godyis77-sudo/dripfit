import { useState, useEffect } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BottomTabBar from '@/components/BottomTabBar';
import GalleryPlayground from '@/components/home/GalleryPlayground';
import AuthenticatedHome from '@/components/home/AuthenticatedHome';
import OnboardingOverlay from '@/components/home/OnboardingOverlay';

/** Check PostHog feature flag without flashing the wrong home layout */
function useFeatureFlag(flag: string, defaultValue = true): { enabled: boolean; ready: boolean } {
  const [enabled, setEnabled] = useState(defaultValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('posthog-js').then((mod) => {
      if (cancelled) return;
      const posthog = mod.default;

      const applyFlag = () => {
        if (cancelled) return;
        const value = posthog.isFeatureEnabled(flag);
        if (typeof value === 'boolean') {
          setEnabled(value);
        }
        setReady(true);
      };

      // PostHog may not be ready immediately — check with callback
      const value = posthog.isFeatureEnabled(flag);
      if (typeof value === 'boolean') {
        setEnabled(value);
        setReady(true);
      } else {
        // Flag not loaded yet — listen for ready
        posthog.onFeatureFlags(applyFlag);
      }
    }).catch(() => {
      // PostHog unavailable — keep default
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [flag]);

  return { enabled, ready };
}

const Welcome = () => {
  usePageMeta({ path: '/home' });
  const { enabled: galleryEnabled, ready: galleryReady } = useFeatureFlag('gallery_playground_enabled', true);

  if (!galleryReady) {
    return (
      <div className="min-h-screen bg-background pb-safe-tab">
        <OnboardingOverlay />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <OnboardingOverlay />
      {galleryEnabled ? <GalleryPlayground /> : <AuthenticatedHome />}
      <BottomTabBar />
    </div>
  );
};

export default Welcome;
