import { useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { hapticFeedback } from '@/lib/haptics';

const TAB_PATHS = ['/home', '/capture', '/tryon', '/style-check', '/profile'];

const SWIPE_THRESHOLD = 120;
const SWIPE_VELOCITY = 0.5;
const SWIPE_MAX_Y = 40;

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const currentIndex = TAB_PATHS.findIndex((p) => {
    if (p === '/home') {
      return location.pathname === '/home' || location.pathname.startsWith('/browse');
    }
    return location.pathname.startsWith(p);
  });

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Ignore multi-touch (pinch zoom) — only track single-finger swipes
    if (e.touches.length > 1) { touchStart.current = null; return; }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || currentIndex === -1) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = Math.abs(t.clientY - touchStart.current.y);
    const dt = Math.max(Date.now() - touchStart.current.t, 1);
    const velocity = Math.abs(dx) / dt;
    touchStart.current = null;

    if (dy > SWIPE_MAX_Y) return;
    
    // Accept either distance-based or velocity-based swipes
    const isValidSwipe = Math.abs(dx) >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY;
    if (!isValidSwipe) return;

    // Special case: swiping right on /browse/* goes back to /home
    if (dx > 0 && location.pathname.startsWith('/browse')) {
      hapticFeedback('light');
      navigate('/home');
      return;
    }

    if (dx < 0 && currentIndex < TAB_PATHS.length - 1) {
      hapticFeedback('light');
      navigate(TAB_PATHS[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      hapticFeedback('light');
      navigate(TAB_PATHS[currentIndex - 1]);
    }
  }, [currentIndex, navigate]);

  return { onTouchStart, onTouchEnd };
}
