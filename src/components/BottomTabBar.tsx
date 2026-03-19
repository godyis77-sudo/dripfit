import { forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import FeatureIcon, { type FeatureIconName } from '@/components/ui/FeatureIcon';

const tabs: { icon: FeatureIconName; label: string; path: string }[] = [
  { icon: 'home', label: 'Home', path: '/' },
  { icon: 'scan', label: 'Scan', path: '/capture' },
  { icon: 'tryon', label: 'Try-On', path: '/tryon' },
  { icon: 'stylecheck', label: 'Style Check', path: '/style-check' },
  { icon: 'profile', label: 'Profile', path: '/profile' },
];

const BottomTabBar = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.nav
      ref={ref}
      data-scroll-obstruction="bottom"
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-[390px] lg:left-1/2 lg:-translate-x-1/2 glass-bar border-t"
    >
      <div className="flex items-center justify-around px-1 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : tab.path === '/capture'
              ? ['/capture', '/analyze', '/scan-success', '/results'].some(p => location.pathname.startsWith(p))
              : location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              className={cn(
                'relative flex flex-col items-center gap-0 rounded-xl px-2 py-1 min-h-[44px] min-w-[44px] transition-all duration-300',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <div className={cn(
                'h-11 w-11 flex items-center justify-center rounded-xl transition-all duration-300',
                isActive && 'scale-110 shadow-gold-glow shimmer-sweep ring-1 ring-primary/40'
              )}>
                <FeatureIcon name={tab.icon} size={44} />
              </div>
              <span className={cn(
                "text-[10px] font-bold tracking-wider uppercase transition-all duration-300",
                isActive ? 'text-primary' : ''
              )}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full gradient-drip"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
});

BottomTabBar.displayName = 'BottomTabBar';

export default BottomTabBar;
