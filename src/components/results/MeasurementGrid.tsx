import { useState } from 'react';
import { motion } from 'framer-motion';

import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MeasurementRange } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';

const CM_TO_IN = 0.3937;
const fmtHeightFtIn = (cm: number) => {
  const totalIn = Math.round(cm * CM_TO_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
};

interface MeasurementGridProps { measurements: Record<string, MeasurementRange>; heightCm: number; visibleKeys?: string[]; }

const MeasurementGrid = ({ measurements, heightCm, visibleKeys }: MeasurementGridProps) => {
  const [expanded, setExpanded] = useState(true);
  const keys = visibleKeys || Object.keys(measurements);
  const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)}`;
  const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)}`;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="section-label">Estimated Measurements</p>
      </div>

      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between text-[11px] text-muted-foreground py-1 mb-1.5">
        <span>{expanded ? 'Hide ranges' : 'Show ranges'}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-1.5">
          {keys.map((key, i) => (
            <motion.div key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card border border-border rounded-lg px-2.5 py-2">
              <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">{MEASUREMENT_LABELS[key] || key}</p>
              <p className="text-[13px] font-bold text-foreground">{fmtCm(measurements[key])}<span className="text-[11px] font-normal text-muted-foreground ml-0.5">cm</span></p>
              <p className="text-[11px] text-muted-foreground">{fmtIn(measurements[key])}<span className="text-[11px] ml-0.5">in</span></p>
            </motion.div>
          ))}
          <div className="bg-card border border-border rounded-lg px-2.5 py-2">
            <p className="text-[9px] font-semibold text-muted-foreground mb-0.5">Height</p>
            <p className="text-[13px] font-bold text-foreground">{fmtHeightFtIn(heightCm)}</p>
            <p className="text-[11px] text-muted-foreground">{heightCm.toFixed(0)}<span className="text-[9px] ml-0.5">cm</span></p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MeasurementGrid;
