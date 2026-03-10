import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Bookmark } from 'lucide-react';

const HomeFAB = () => {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);
  const closeFab = useCallback(() => setFabOpen(false), []);

  const items = [
    { icon: <span className="text-sm">📷</span>, label: 'New Body Scan', action: () => navigate('/capture') },
    { icon: <Sparkles className="h-4 w-4 text-primary-foreground" />, label: 'New Try-On', action: () => navigate('/tryon') },
    { icon: <span className="text-sm">📏</span>, label: 'Size Guide', action: () => navigate('/size-guide') },
    { icon: <Bookmark className="h-4 w-4 text-primary-foreground" />, label: 'Save a Look', action: () => navigate('/style-check') },
  ];

  return (
    <>
      {/* Scrim */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closeFab}
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-20 right-5 z-50 lg:right-[calc(50%-195px+20px)]">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 flex flex-col gap-2.5 items-end"
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
                    className="h-11 w-11 rounded-full bg-primary shadow-lg flex items-center justify-center active:scale-90 transition-transform"
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
          className="h-12 w-12 rounded-full bg-primary shadow-lg flex items-center justify-center"
          style={{ boxShadow: '0 0 24px -4px hsl(45 88% 40% / 0.4)' }}
          aria-label={fabOpen ? 'Close menu' : 'Quick actions'}
        >
          <Plus className={`h-5 w-5 text-primary-foreground transition-transform duration-200 ease-in-out ${fabOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>
    </>
  );
};

export default HomeFAB;
