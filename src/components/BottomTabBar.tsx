import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, Shirt, Users, User, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const tabs = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Camera, label: 'Scan', path: '/capture' },
  { icon: Shirt, label: 'Try-On', path: '/tryon' },
  { icon: Users, label: 'Fit Check', path: '/community' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const BottomTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 glass"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <tab.icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_hsl(42_45%_62%/0.4)]')} />
              <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full gradient-drip"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default BottomTabBar;
