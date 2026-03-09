import { motion } from 'framer-motion';
import type { FitPreference } from '@/lib/types';

interface FitPreferenceToggleProps {
  value: FitPreference;
  onChange: (v: FitPreference) => void;
}

const options: { value: FitPreference; label: string; desc: string }[] = [
  { value: 'fitted', label: 'Fitted', desc: 'Closer silhouette' },
  { value: 'regular', label: 'Regular', desc: 'Balanced comfort' },
  { value: 'relaxed', label: 'Relaxed', desc: 'More ease' },
];

const FitPreferenceToggle = ({ value, onChange }: FitPreferenceToggleProps) => {
  const active = options.find(o => o.value === value)!;

  return (
    <div className="mb-4">
      <p className="section-label mb-1.5">Fit Preference</p>
      <div role="radiogroup" aria-label="Fit preference" className="relative flex bg-card rounded-lg p-0.5 border border-border">
        {options.map(opt => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex-1 py-2 text-[12px] font-semibold rounded-md transition-colors ${
              value === opt.value ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {opt.label}
            {value === opt.value && (
              <motion.div layoutId="fit-pill" className="absolute inset-0 gradient-drip rounded-md -z-10" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 text-center italic">{active.desc}</p>
    </div>
  );
};

export default FitPreferenceToggle;
