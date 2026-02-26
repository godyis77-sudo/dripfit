import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveBannerProps {
  visible: boolean;
  onDismiss: () => void;
  navigateTo?: string;
  label?: string;
  subtext?: string;
}

const SaveBanner = ({
  visible,
  onDismiss,
  navigateTo = '/profile',
  label = 'Saved successfully',
  subtext = 'View in Profile > Wardrobe',
}: SaveBannerProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={onDismiss}
          className="fixed top-0 left-0 right-0 z-[60] flex justify-center px-4 pt-3 pointer-events-auto"
        >
          <div className="w-full max-w-sm bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-3 border-l-4 border-l-primary shadow-lg cursor-pointer">
            <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Check className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-foreground">{label}</p>
              <p className="text-[11px] text-muted-foreground">{subtext}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
                navigate(navigateTo);
              }}
              className="text-[11px] font-bold text-primary shrink-0 active:opacity-70"
            >
              View Now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SaveBanner;
