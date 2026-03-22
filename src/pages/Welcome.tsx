import { usePageTitle } from '@/hooks/usePageTitle';
import BottomTabBar from '@/components/BottomTabBar';
import GalleryPlayground from '@/components/home/GalleryPlayground';

const Welcome = () => {
  usePageTitle();

  return (
    <div className="min-h-screen bg-background">
      <GalleryPlayground />
      <BottomTabBar />
    </div>
  );
};

export default Welcome;
