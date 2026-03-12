import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, SlidersHorizontal, Info, Ruler } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { Confidence, MeasurementRange } from '@/lib/types';
import { trackEvent } from '@/lib/analytics';

interface TrustPanelProps {
  confidence: Confidence;
  recommendedSize: string;
  measurements: Record<string, MeasurementRange>;
  onAdjust: (key: string, newRange: MeasurementRange) => void;
  retailer?: string;
}

const BETWEEN_SIZES: Record<string, string> = {
  high: 'You are solidly in this size — go with confidence.',
  medium: 'If between sizes, go up for comfort or down for a fitted look.',
  low: 'Between sizes? We recommend sizing up to be safe.',
};

const BRAND_NOTES: Record<string, string> = {
  Zara: 'Runs slim in tops — size up if between sizes.',
  'H&M': 'True to size across most categories.',
  SHEIN: 'Sizing varies by item — check measurements carefully.',
  Gap: 'Relaxed fit — true to size or size down for fitted.',
  Lululemon: 'Technical sizing — follow measurement chart closely.',
  Nordstrom: 'Brand-dependent — varies by label.',
  Aritzia: 'Tends to run small — consider sizing up.',
};

const ADJUSTABLE = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'inseam', label: 'Inseam' },
];

const confIcon: Record<Confidence, typeof Shield> = { high: ShieldCheck, medium: Shield, low: ShieldAlert };
const confColor: Record<Confidence, string> = {
  high: 'text-green-500',
  medium: 'text-primary',
  low: 'text-orange-500',
};

const TrustPanel = ({ confidence, recommendedSize, measurements, onAdjust, retailer }: TrustPanelProps) => {
  const [expanded, setExpanded] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const Icon = confIcon[confidence];
  const brandNote = retailer ? BRAND_NOTES[retailer] : null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden mb-3">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 active:scale-[0.99] transition-transform"
      >
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className={`h-4 w-4 ${confColor[confidence]}`} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[11px] font-bold text-foreground">Why this size?</p>
          <p className="text-[9px] text-muted-foreground truncate">{BETWEEN_SIZES[confidence]}</p>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-2.5">
              {/* Confidence explanation */}
              <div className="flex items-start gap-2">
                <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {confidence === 'high' && 'Both photos were clear and well-lit. Measurements are highly accurate.'}
                  {confidence === 'medium' && 'Good accuracy. For better results, use a plain wall background and fitted clothing.'}
                  {confidence === 'low' && 'We had trouble reading measurements. Try rescanning with better lighting and fitted clothes.'}
                </p>
              </div>

              {/* Between sizes guidance */}
              <div className="bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-2">
                <p className="text-[10px] font-bold text-foreground mb-0.5 flex items-center gap-1">
                  <Ruler className="h-3 w-3 text-primary" /> Between sizes?
                </p>
                <p className="text-[9px] text-muted-foreground leading-relaxed">{BETWEEN_SIZES[confidence]}</p>
              </div>

              {/* Brand sizing note */}
              {brandNote && (
                <div className="bg-accent/5 border border-accent/10 rounded-lg px-2.5 py-2">
                  <p className="text-[10px] font-bold text-foreground mb-0.5">{retailer} sizing note</p>
                  <p className="text-[9px] text-muted-foreground">{brandNote}</p>
                </div>
              )}

              {/* Quick adjust toggle */}
              <button
                onClick={() => { setShowAdjust(!showAdjust); trackEvent('measurement_adjusted' as any); }}
                className="w-full flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-2 active:scale-[0.98] transition-transform"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-bold text-foreground">Quick adjust measurements</span>
                <span className="text-[10px] text-muted-foreground ml-auto">Updates size in real time</span>
              </button>

              <AnimatePresence>
                {showAdjust && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    {ADJUSTABLE.map(({ key, label }) => {
                      const range = measurements[key];
                      if (!range) return null;
                      const mid = (range.min + range.max) / 2;
                      const spread = Math.max((range.max - range.min) / 2, 2);
                      const sliderMin = Math.round(mid - spread * 3);
                      const sliderMax = Math.round(mid + spread * 3);

                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                            <span className="text-[10px] font-bold text-foreground">{range.min.toFixed(0)}–{range.max.toFixed(0)} cm</span>
                          </div>
                          <Slider
                            min={sliderMin}
                            max={sliderMax}
                            step={1}
                            value={[Math.round(mid)]}
                            onValueChange={([val]) => {
                              onAdjust(key, { min: val - spread, max: val + spread });
                            }}
                            className="w-full"
                          />
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrustPanel;
