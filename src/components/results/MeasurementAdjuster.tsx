import { useState } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal, Info } from 'lucide-react';
import type { MeasurementRange } from '@/lib/types';

interface MeasurementAdjusterProps {
  measurements: Record<string, MeasurementRange>;
  onAdjust: (key: string, newRange: MeasurementRange) => void;
}

const ADJUSTABLE_KEYS = [
  { key: 'chest', label: 'Chest', unit: 'cm' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'hips', label: 'Hips', unit: 'cm' },
  { key: 'inseam', label: 'Inseam', unit: 'cm' },
];

const MeasurementAdjuster = ({ measurements, onAdjust }: MeasurementAdjusterProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2.5 active:scale-[0.98] transition-transform"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold text-foreground">Adjust Measurements</span>
        <span className="text-[11px] text-muted-foreground ml-auto">Fine-tune for accuracy</span>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <div className="bg-card border border-border border-t-0 rounded-b-lg px-3 py-3 space-y-4">
            <div className="flex items-start gap-1.5 mb-1">
              <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Drag sliders to fine-tune. Size recommendation updates in real time.
              </p>
            </div>

            {ADJUSTABLE_KEYS.map(({ key, label, unit }) => {
              const range = measurements[key];
              if (!range) return null;
              const mid = (range.min + range.max) / 2;
              const spread = Math.max((range.max - range.min) / 2, 2);
              const sliderMin = Math.round(mid - spread * 3);
              const sliderMax = Math.round(mid + spread * 3);

              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                    <span className="text-[11px] font-bold text-foreground">
                      {range.min.toFixed(0)}–{range.max.toFixed(0)} {unit}
                    </span>
                  </div>
                  <Slider
                    min={sliderMin}
                    max={sliderMax}
                    step={1}
                    value={[Math.round(mid)]}
                    onValueChange={([val]) => {
                      const newSpread = spread;
                      onAdjust(key, { min: val - newSpread, max: val + newSpread });
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-muted-foreground/50">{sliderMin}</span>
                    <span className="text-[10px] text-muted-foreground/50">{sliderMax}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MeasurementAdjuster;
