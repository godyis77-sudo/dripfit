import { usePageMeta } from '@/hooks/usePageMeta';
import BottomTabBar from '@/components/BottomTabBar';
import AuthenticatedHome from '@/components/home/AuthenticatedHome';

const Welcome = () => {
  usePageMeta({ path: '/home' });

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <AuthenticatedHome />
      <BottomTabBar />
    </div>
  );
};

export default Welcome;
