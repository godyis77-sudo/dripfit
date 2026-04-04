import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import BodyDiagram from '@/components/results/BodyDiagram';
import MeasurementGrid from '@/components/results/MeasurementGrid';
import type { BodyScanResult } from '@/lib/types';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';

const ScanSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { result: BodyScanResult } | undefined;
  const result = state?.result;
  

  useEffect(() => {
    if (!result) {
      navigate('/capture', { replace: true });
    }
  }, [result, navigate]);

  // App Store rating prompt — fires once, 3s after mount
  useEffect(() => {
    if (!result) return;
    if (!Capacitor.isNativePlatform()) return;
    if (localStorage.getItem('rating_prompted')) return;

    const timer = window.setTimeout(() => {
      import('@capawesome/capacitor-app-review').then(({ AppReview }) => {
        AppReview.requestReview().catch(() => {});
        localStorage.setItem('rating_prompted', 'true');
      });
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [result]);

  const { user } = useAuth();

  if (!result) return null;

  const resultsPath = user ? '/profile/body' : '/results';
  const handleNavigate = (path: string) => {
    navigate(path, { replace: true, state: path === '/results' ? { result } : undefined });
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background relative pb-safe-tab">
      {/* Skip button */}
      <button
        onClick={() => handleNavigate(resultsPath)}
        className="absolute top-5 right-5 text-[11px] text-muted-foreground font-medium z-20 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        Skip →
      </button>

      {/* Scan results image with measurement overlays */}
      <motion.div
        className="relative w-full max-w-[400px] mx-auto mt-2 px-2 flex justify-center"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative" style={{ width: 420 * 0.75, height: 420 }}>
          <DecorativeSilhouette height={420} />

          {/* Dynamic measurement values */}
          {OVERLAYS.map((overlay) => {
            const val = overlay.getValue(result);
            if (!val) return null;

            return (
              <motion.div
                key={overlay.key}
                className="absolute z-20 pointer-events-none"
                style={{
                  top: overlay.valTop,
                  ...(overlay.side === 'left'
                    ? { left: '4%' }
                    : { right: '4%' }),
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: overlay.delay + 0.4, duration: 0.35, ease: 'easeOut' }}
              >
                <div
                  className="bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5 border border-primary/30"
                  style={{ textAlign: overlay.side === 'left' ? 'left' : 'right' }}
                >
                  <p className="text-[10px] font-black leading-tight text-primary">
                    {val.line1}
                  </p>
                  <p className="text-[9px] font-bold leading-tight text-muted-foreground">
                    {val.line2}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Bottom section */}
      <div className="w-full px-6 pb-8 flex flex-col items-center mt-4">
        {/* Fit Identity Updated badge */}
        <motion.div
          className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 mb-5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.4 }}
        >
          <Check className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-bold text-primary">Fit Identity Updated</span>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="w-full max-w-[300px] space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.4 }}
        >
          <Button
            className="w-full h-12 rounded-xl text-sm font-bold btn-luxury"
            onClick={() => handleNavigate(resultsPath)}
          >
            See My Sizes <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <button
            onClick={() => handleNavigate('/home')}
            className="w-full text-center text-[11px] text-muted-foreground py-2"
          >
            Go Home
          </button>
        </motion.div>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default ScanSuccess;
