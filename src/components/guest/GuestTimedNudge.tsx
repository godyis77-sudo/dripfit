import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { isGuestMode } from '@/lib/session';

const NUDGE_DELAY_MS = 10 * 60 * 1000; // 10 minutes
const NUDGE_KEY = 'dripcheck_timed_nudge_dismissed';

const GuestTimedNudge = React.forwardRef<HTMLDivElement>(function GuestTimedNudge(_, ref) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (user || !isGuestMode()) return;
    try { if (sessionStorage.getItem(NUDGE_KEY) === 'true') return; } catch {}

    const timer = setTimeout(() => setShow(true), NUDGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user]);

  if (user || !show) return null;

  const dismiss = () => {
    setShow(false);
    try { sessionStorage.setItem(NUDGE_KEY, 'true'); } catch {}
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-0 right-0 z-[55] flex justify-center px-4 pointer-events-auto"
        >
          <div className="w-full max-w-sm bg-card border border-primary/30 rounded-2xl p-4 shadow-xl relative">
            <button onClick={dismiss} className="absolute top-2 right-2 text-muted-foreground" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground">Enjoying DripFit?</p>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3">
              Create a free account to save your scans, try-ons, and wardrobe across all your devices.
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 btn-luxury text-[12px]" onClick={() => { dismiss(); navigate('/auth'); }}>
                Sign Up Free
              </Button>
              <Button size="sm" variant="outline" className="text-[12px]" onClick={dismiss}>
                Maybe Later
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuestTimedNudge;
