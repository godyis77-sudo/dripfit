import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Check } from 'lucide-react';
import type { FitPreference } from '@/lib/types';

interface AlternativeSizesProps {
  sizeDown: string;
  sizeUp: string;
  best: string;
  fitPreference: FitPreference;
}

const fitOptions: { value: FitPreference; label: string; desc: string }[] = [
  { value: 'fitted', label: 'Fitted', desc: 'Closer cut' },
  { value: 'regular', label: 'Regular', desc: 'True to size' },
  { value: 'relaxed', label: 'Relaxed', desc: 'More room' },
];

const AlternativeSizes = ({ sizeDown, sizeUp, best, fitPreference }: AlternativeSizesProps) => {
  const sizeMap: Record<FitPreference, string> = {
    fitted: sizeDown !== best ? sizeDown : best,
    regular: best,
    relaxed: sizeUp !== best ? sizeUp : best,
  };

  // If fitted=regular=relaxed all same, adjust for display
  if (fitPreference === 'regular') {
    sizeMap.fitted = sizeDown;
    sizeMap.relaxed = sizeUp;
  } else if (fitPreference === 'fitted') {
    sizeMap.regular = sizeUp !== best ? best : best;
    sizeMap.relaxed = sizeUp;
  } else {
    sizeMap.fitted = sizeDown;
    sizeMap.regular = sizeDown !== best ? best : best;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-4">
      <p className="section-label mb-1.5">All Fit Options</p>
      <div className="grid grid-cols-3 gap-1.5">
        {fitOptions.map(opt => {
          const isActive = opt.value === fitPreference;
          const size = sizeMap[opt.value];
          return (
            <div
              key={opt.value}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 border transition-all ${
                isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card'
              }`}
            >
              {isActive && <Check className="h-3 w-3 text-primary" />}
              <p className={`text-[15px] font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>{size}</p>
              <p className={`text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{opt.label}</p>
              <p className="text-[9px] text-muted-foreground">{opt.desc}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default AlternativeSizes;
