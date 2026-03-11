import { forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Shirt, Users, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const tabs = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Camera, label: 'Scan', path: '/capture' },
  { icon: Shirt, label: 'Try-On', path: '/tryon' },
  { icon: Users, label: 'Style Check', path: '/style-check' },
  { icon: User, label: 'Profile', path: '/profile' },
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
      className="fixed bottom-0 left-0 right-0 z-50 lg:max-w-[390px] lg:left-1/2 lg:-translate-x-1/2 bg-background/80 backdrop-blur-2xl border-t border-border/50"
    >
      <div className="flex items-center justify-around px-2 py-2 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
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
                'relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 min-h-[44px] min-w-[44px] transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <div className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-200',
                isActive
                  ? 'icon-3d-gold shimmer-sweep'
                  : 'icon-3d'
              )}>
                <tab.icon className={cn('h-4 w-4 transition-all duration-200', isActive ? 'text-primary-foreground shimmer-icon' : '')} />
              </div>
              <span className="text-[9px] font-semibold tracking-wider uppercase">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full gradient-drip"
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
