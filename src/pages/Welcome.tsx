import { usePageMeta } from '@/hooks/usePageMeta';
import BottomTabBar from '@/components/BottomTabBar';
import Home from '@/components/home/Home';
import OnboardingOverlay from '@/components/home/OnboardingOverlay';

const Welcome = () => {
  usePageMeta({ path: '/home' });

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <OnboardingOverlay />
      <Home />
      <BottomTabBar />
    </div>
  );
};

export default Welcome;
