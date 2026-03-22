import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import demoImg1 from '@/assets/demo-tryon-1.jpg';
import demoImg2 from '@/assets/demo-tryon-2.jpg';
import demoImg3 from '@/assets/demo-tryon-3.jpg';
import demoImg4 from '@/assets/demo-tryon-4.jpg';

const DEMO_RESULTS = [
  { id: 'demo-1', image: demoImg1, label: 'Cream Blazer Look', brand: 'Zara' },
  { id: 'demo-2', image: demoImg2, label: 'Navy Bomber Fit', brand: 'H&M' },
  { id: 'demo-3', image: demoImg3, label: 'Red Midi Dress', brand: 'Mango' },
  { id: 'demo-4', image: demoImg4, label: 'Leather Jacket', brand: 'ASOS' },
] as const;

const DemoTryOnSection = () => {
  const navigate = useNavigate();

  const handleTryThis = () => {
    trackEvent('demo_tryon_cta_click');
    navigate('/tryon');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="mb-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[13px] font-bold text-foreground">See It In Action</h2>
        </div>
        <button
          onClick={handleTryThis}
          className="text-[11px] font-semibold text-primary flex items-center gap-0.5 active:opacity-70"
        >
          Try It Yourself <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1"
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      >
        {DEMO_RESULTS.map((demo) => (
          <button
            key={demo.id}
            onClick={handleTryThis}
            className="shrink-0 w-[130px] rounded-xl overflow-hidden border border-primary/20 bg-card active:scale-[0.96] transition-transform group"
          >
            <div className="aspect-[3/4] relative overflow-hidden">
              <img
                src={demo.image}
                alt={demo.label}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
              {/* AI badge */}
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/90 text-primary-foreground text-[8px] font-bold uppercase tracking-wider">
                <Sparkles className="h-2.5 w-2.5" /> AI Try-On
              </span>
              {/* Hover CTA */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-2 px-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold text-white">Try This Look →</span>
              </div>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{demo.brand}</p>
              <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{demo.label}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.section>
  );
};

export default DemoTryOnSection;
