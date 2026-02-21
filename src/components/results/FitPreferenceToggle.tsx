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
    <div className="mb-5">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Fit Preference</p>
      <div className="relative flex bg-card rounded-xl p-1 border border-border">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              value === opt.value ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {opt.label}
            {value === opt.value && (
              <motion.div
                layoutId="fit-pill"
                className="absolute inset-0 gradient-drip rounded-lg -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5 text-center italic">
        {active.desc}
      </p>
    </div>
  );
};

export default FitPreferenceToggle;
