import { useState } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MeasurementRange } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';

const CM_TO_IN = 0.3937;

interface MeasurementGridProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
  visibleKeys?: string[];
}

const MeasurementGrid = ({ measurements, heightCm, visibleKeys }: MeasurementGridProps) => {
  const [useCm, setUseCm] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const keys = visibleKeys || Object.keys(measurements);
  const unitLabel = useCm ? 'cm' : 'in';

  const formatRange = (r: MeasurementRange) => {
    if (useCm) return `${r.min.toFixed(0)}–${r.max.toFixed(0)}`;
    return `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)}`;
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimated Measurements</p>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
          <Switch checked={!useCm} onCheckedChange={v => setUseCm(!v)} className="scale-75" />
          <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>in</span>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-xs text-muted-foreground py-1.5 mb-2"
      >
        <span>{expanded ? 'Hide ranges' : 'Show measurement ranges'}</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="grid grid-cols-2 gap-2"
        >
          {keys.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl px-3 py-2"
            >
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{MEASUREMENT_LABELS[key] || key}</p>
              <p className="text-base font-bold text-foreground">
                {formatRange(measurements[key])}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">{unitLabel}</span>
              </p>
            </motion.div>
          ))}
          <div className="bg-card border border-border rounded-xl px-3 py-2">
            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Height</p>
            <p className="text-base font-bold text-foreground">
              {useCm ? heightCm.toFixed(0) : (heightCm * CM_TO_IN).toFixed(1)}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">{unitLabel}</span>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MeasurementGrid;
