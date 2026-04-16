import { useState, useEffect } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BottomTabBar from '@/components/BottomTabBar';
import GalleryPlayground from '@/components/home/GalleryPlayground';
import AuthenticatedHome from '@/components/home/AuthenticatedHome';
import OnboardingOverlay from '@/components/home/OnboardingOverlay';

/** Check PostHog feature flag — renders with default immediately, updates reactively */
function useFeatureFlag(flag: string, defaultValue = true): boolean {
  const [enabled, setEnabled] = useState(defaultValue);

  useEffect(() => {
    let cancelled = false;
    import('posthog-js').then((mod) => {
      if (cancelled) return;
      const posthog = mod.default;
      const apply = () => {
        if (cancelled) return;
        const value = posthog.isFeatureEnabled(flag);
        if (typeof value === 'boolean') setEnabled(value);
      };
      apply();
      posthog.onFeatureFlags(apply);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [flag]);

  return enabled;
}

const Welcome = () => {
  usePageMeta({ path: '/home' });
  const galleryEnabled = useFeatureFlag('gallery_playground_enabled', true);

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <OnboardingOverlay />
      {galleryEnabled ? <GalleryPlayground /> : <AuthenticatedHome />}
      <BottomTabBar />
    </div>
  );
};

export default Welcome;
