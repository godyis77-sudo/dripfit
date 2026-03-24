import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { hapticFeedback } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 80;

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const touchStart = useRef<number | null>(null);
  const pullY = useMotionValue(0);
  const indicatorOpacity = useTransform(pullY, [0, PULL_THRESHOLD], [0, 1]);
  const indicatorRotation = useTransform(pullY, [0, PULL_THRESHOLD], [0, 180]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) {
      touchStart.current = e.touches[0].clientY;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dy = Math.max(0, e.touches[0].clientY - touchStart.current);
    pullY.set(Math.min(dy * 0.5, PULL_THRESHOLD * 1.5));
  }, [pullY]);

  const handleTouchEnd = useCallback(async () => {
    if (touchStart.current === null) return;
    touchStart.current = null;

    if (pullY.get() >= PULL_THRESHOLD && !refreshing) {
      hapticFeedback('medium');
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        pullY.set(0);
      }
    } else {
      pullY.set(0);
    }
  }, [pullY, refreshing, onRefresh]);

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        style={{ opacity: indicatorOpacity, y: pullY }}
        className="absolute inset-x-0 top-0 z-50 flex items-center justify-center py-3 pointer-events-none -translate-y-full"
      >
        <motion.div
          style={{ rotate: refreshing ? undefined : indicatorRotation }}
          animate={refreshing ? { rotate: 360 } : undefined}
          transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : undefined}
        >
          <RefreshCw className="h-5 w-5 text-primary" />
        </motion.div>
      </motion.div>
      {children}
    </div>
  );
}
