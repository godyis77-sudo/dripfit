import { forwardRef, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { hapticFeedback } from '@/lib/haptics';
import FeatureIcon, { type FeatureIconName } from '@/components/ui/FeatureIcon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const tabs: { icon: FeatureIconName; label: string; path: string }[] = [
  { icon: 'home', label: 'Home', path: '/home' },
  { icon: 'post', label: 'Scan', path: '/capture' },
  { icon: 'tryon', label: 'Drape', path: '/tryon' },
  { icon: 'stylecheck', label: 'Twins', path: '/style-check' },
  { icon: 'profile', label: 'Profile', path: '/profile' },
];

const BottomTabBar = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [hidden, setHidden] = useState(false);
  const [hasScan, setHasScan] = useState(true); // default true to avoid flash
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!user) { setHasScan(false); return; }
    supabase.from('body_scans').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
      setHasScan(!!(data && data.length > 0));
    });
  }, [user]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const atBottom = (window.innerHeight + y) >= (document.documentElement.scrollHeight - 40);
      const scrollingDown = y > lastScrollY.current + 4;
      lastScrollY.current = y;
      setHidden(atBottom || (scrollingDown && y > 200));
    };

    // Reset when navigating
    setHidden(false);
    lastScrollY.current = 0;

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  const handleTabPress = (path: string) => {
    hapticFeedback('light');
    navigate(path);
  };

  return (
    <motion.nav
      ref={ref}
      data-scroll-obstruction="bottom"
      initial={{ y: 80 }}
      animate={{ y: hidden ? 100 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-[390px] lg:left-1/2 lg:-translate-x-1/2 bg-background/90 backdrop-blur-xl border-t border-white/[0.04] will-change-transform"
    >
      <div className="flex items-center justify-around px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isScan = tab.label === 'Scan';
          const isActive = tab.path === '/home'
            ? location.pathname === '/home'
            : tab.path === '/capture'
              ? ['/capture', '/analyze', '/scan-success', '/results'].some(p => location.pathname.startsWith(p))
              : location.pathname.startsWith(tab.path);
          const showPulse = isScan && !hasScan && !isActive;
          return (
            <motion.button
              key={tab.path}
              onClick={() => handleTabPress(tab.path)}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.1 }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center gap-0 rounded-xl px-2 py-1 min-h-[44px] min-w-[44px] transition-colors duration-300',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground/50 active:text-foreground'
              )}
            >
              <div className={cn("flex items-center justify-center relative", 'h-8 w-8')}>
                {showPulse && (
                  <span className="absolute -inset-1 rounded-full border border-primary/30 animate-ping pointer-events-none" style={{ animationDuration: '2.5s' }} />
                )}
                <FeatureIcon name={tab.icon} size={isScan ? 22 : 20} />
              </div>
              <span className={cn(
                "text-[10px] tracking-[0.1em] uppercase transition-colors duration-300 mt-0.5",
                isScan ? 'font-bold' : 'font-semibold',
                isActive ? 'text-primary' : 'text-muted-foreground/50'
              )}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="w-1 h-1 rounded-full bg-primary mt-0.5"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
});

BottomTabBar.displayName = 'BottomTabBar';

export default BottomTabBar;
