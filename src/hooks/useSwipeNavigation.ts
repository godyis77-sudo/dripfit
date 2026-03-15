import { useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TAB_PATHS = ['/', '/capture', '/tryon', '/style-check', '/profile'];

const SWIPE_THRESHOLD = 200;
const SWIPE_MAX_Y = 50;

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const currentIndex = TAB_PATHS.findIndex((p) =>
    p === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(p)
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || currentIndex === -1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = Math.abs(t.clientY - touchStart.current.y);
    touchStart.current = null;

    if (dy > SWIPE_MAX_Y || Math.abs(dx) < SWIPE_THRESHOLD) return;

    if (dx < 0 && currentIndex < TAB_PATHS.length - 1) {
      navigate(TAB_PATHS[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      navigate(TAB_PATHS[currentIndex - 1]);
    }
  }, [currentIndex, navigate]);

  return { onTouchStart, onTouchEnd };
}
