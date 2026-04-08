import { useState } from 'react';
import { motion } from 'framer-motion';

import { ChevronDown, ChevronUp } from 'lucide-react';
import type { MeasurementRange } from '@/lib/types';
import { MEASUREMENT_LABELS } from '@/lib/types';
import { getUseCm } from '@/lib/session';

const CM_TO_IN = 0.3937;
const fmtHeightFtIn = (cm: number) => {
  const totalIn = Math.round(cm * CM_TO_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
};

interface MeasurementGridProps { measurements: Record<string, MeasurementRange>; heightCm: number; visibleKeys?: string[]; }

const MeasurementGrid = ({ measurements, heightCm, visibleKeys }: MeasurementGridProps) => {
  const [expanded, setExpanded] = useState(true);
  const useCm = getUseCm();
  const keys = visibleKeys || Object.keys(measurements);
  const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)}`;
  const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)}`;

  const primaryFmt = useCm ? fmtCm : fmtIn;
  const primaryUnit = useCm ? 'cm' : 'in';
  const secondaryFmt = useCm ? fmtIn : fmtCm;
  const secondaryUnit = useCm ? 'in' : 'cm';

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">Estimated Measurements</p>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-[11px] py-1.5 mb-1.5 bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg px-3 text-white/60 hover:bg-white/8 transition-colors"
      >
        <span>{expanded ? 'Hide ranges' : 'Show ranges'}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="grid grid-cols-2 gap-1.5">
          {keys.map((key, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-black/30 backdrop-blur-sm border border-white/6 rounded-lg px-2.5 py-2"
            >
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-0.5">{MEASUREMENT_LABELS[key] || key}</p>
              <p className="font-display text-[13px] font-semibold text-white">{primaryFmt(measurements[key])}<span className="text-[11px] font-normal text-white/30 ml-0.5">{primaryUnit}</span></p>
              <p className="text-[11px] text-white/30">{secondaryFmt(measurements[key])}<span className="text-[11px] ml-0.5">{secondaryUnit}</span></p>
            </motion.div>
          ))}
          <div className="bg-black/30 backdrop-blur-sm border border-white/6 rounded-lg px-2.5 py-2">
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-0.5">Height</p>
            {useCm ? (
              <>
                <p className="font-display text-[13px] font-semibold text-white">{heightCm.toFixed(0)}<span className="text-[11px] font-normal text-white/30 ml-0.5">cm</span></p>
                <p className="text-[11px] text-white/30">{fmtHeightFtIn(heightCm)}</p>
              </>
            ) : (
              <>
                <p className="font-display text-[13px] font-semibold text-white">{fmtHeightFtIn(heightCm)}</p>
                <p className="text-[11px] text-white/30">{heightCm.toFixed(0)}<span className="text-[11px] ml-0.5">cm</span></p>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MeasurementGrid;
