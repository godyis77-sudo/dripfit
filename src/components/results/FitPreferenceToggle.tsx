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
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-1.5">Fit Preference</p>
      <div role="radiogroup" aria-label="Fit preference" className="relative flex bg-black/30 backdrop-blur-sm rounded-lg p-0.5 border border-white/8 gap-0.5">
        {options.map(opt => (
          <button
            key={opt.value}
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 flex-1 py-2 text-[12px] font-semibold rounded-md transition-all ${
              value === opt.value
                ? 'bg-primary/10 border border-primary/25 text-primary'
                : 'text-white/50 hover:bg-white/5 border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-white/30 mt-1 text-center italic">{active.desc}</p>
    </div>
  );
};

export default FitPreferenceToggle;
