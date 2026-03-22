import { useState, useCallback, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import FeatureIcon from '@/components/ui/FeatureIcon';

const HomeFAB = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);
  const closeFab = useCallback(() => setFabOpen(false), []);

  const items = [
    { icon: <FeatureIcon name="scan" size={22} />, label: 'New Body Scan', action: () => navigate('/capture') },
    { icon: <FeatureIcon name="tryon" size={22} />, label: 'New Try-On', action: () => navigate('/tryon') },
    { icon: <FeatureIcon name="sizeguide" size={22} />, label: 'Size Guide', action: () => navigate('/size-guide') },
    { icon: <FeatureIcon name="stylecheck" size={22} />, label: 'Style Check', action: () => navigate('/style-check') },
  ];

  return createPortal(
    <div className="fixed bottom-20 right-5 z-50 lg:right-[calc(50%-195px+20px)]">
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
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setFabOpen(!fabOpen)}
        className="h-12 w-12 rounded-full badge-gold-3d shimmer-sweep glow-primary relative z-50 flex items-center justify-center"
        aria-label={fabOpen ? 'Close menu' : 'Quick actions'}
      >
        <Plus className={`h-5 w-5 text-primary-foreground transition-transform duration-200 ease-in-out ${fabOpen ? 'rotate-45' : ''}`} />
      </motion.button>
    </div>,
    document.body
  );
};

export default HomeFAB;
