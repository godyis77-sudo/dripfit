import { useState, useCallback, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import FeatureIcon from '@/components/ui/FeatureIcon';

const HomeFAB = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);
  const closeFab = useCallback(() => setFabOpen(false), []);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const key = 'fab_tooltip_shown';
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setShowTooltip(true), 1000);
      const dismiss = setTimeout(() => { setShowTooltip(false); localStorage.setItem(key, 'true'); }, 4000);
      return () => { clearTimeout(t); clearTimeout(dismiss); };
    }
  }, []);

  const items = [
    { icon: <FeatureIcon name="scan" size={22} />, label: 'New Body Scan', action: () => navigate('/capture') },
    { icon: <FeatureIcon name="tryon" size={22} />, label: 'New Try-On', action: () => navigate('/tryon') },
    { icon: <FeatureIcon name="sizeguide" size={22} />, label: 'Size Guide', action: () => navigate('/size-guide') },
    { icon: <FeatureIcon name="stylecheck" size={22} />, label: 'Style Check', action: () => navigate('/style-check') },
    { icon: <FeatureIcon name="home" size={22} />, label: 'Style Assistant', action: () => navigate('/style-assistant') },
  ];

  return createPortal(
    <div ref={ref} className="fixed bottom-20 right-5 z-50 lg:right-[calc(50%-195px+20px)]">
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closeFab}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fabOpen && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-3 flex flex-col gap-2.5 items-end relative z-50"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.8 }}
                transition={{ delay: idx * 0.06, duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className="text-[11px] font-semibold text-foreground bg-card border border-border rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                  {item.label}
                </span>
                <button
                  onClick={() => { closeFab(); item.action(); }}
                  className="h-11 w-11 rounded-full badge-gold-3d shimmer-sweep active:scale-90 transition-transform flex items-center justify-center"
                >
                  {item.icon}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative">
        <AnimatePresence>
          {showTooltip && !fabOpen && (
            <motion.div
              key="tooltip"
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              className="absolute -top-10 right-0 bg-card border border-primary/30 rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap z-50"
            >
              <span className="text-[11px] font-bold text-primary">Quick Try-On ✨</span>
              <div className="absolute -bottom-1 right-4 w-2 h-2 bg-card border-b border-r border-primary/30 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => { setFabOpen(!fabOpen); setShowTooltip(false); }}
          className="h-12 w-12 rounded-full badge-gold-3d shimmer-sweep glow-primary relative z-50 flex items-center justify-center"
          aria-label={fabOpen ? 'Close menu' : 'Quick actions'}
        >
          <Plus className={`h-5 w-5 text-primary-foreground transition-transform duration-200 ease-in-out ${fabOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>
    </div>,
    document.body
  );
});

HomeFAB.displayName = 'HomeFAB';

export default HomeFAB;
