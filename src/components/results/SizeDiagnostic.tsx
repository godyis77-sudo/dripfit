import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle, ArrowDown, ArrowUp } from 'lucide-react';

interface MeasurementBreakdown {
  key: string;
  user_value: number;
  chart_min: number;
  chart_max: number;
  score: number;
  status: string; // 'match' | 'close' | 'too_small' | 'too_large' | 'out_of_range'
}

interface SizeDiagnosticProps {
  breakdown: MeasurementBreakdown[];
  recommendedSize: string;
  brandName?: string;
  confidence: number;
}

const LABELS: Record<string, string> = {
  chest: 'Chest',
  waist: 'Waist',
  hip: 'Hips',
  shoulder: 'Shoulder',
  inseam: 'Inseam',
  sleeve: 'Sleeve',
  height: 'Height',
};

const statusConfig = {
  match: { icon: CheckCircle2, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', label: 'Match' },
  close: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Close' },
  too_small: { icon: ArrowDown, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Below range' },
  too_large: { icon: ArrowUp, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Above range' },
  out_of_range: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', label: 'Out of range' },
};

const SizeDiagnostic = ({ breakdown, recommendedSize, brandName, confidence }: SizeDiagnosticProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!breakdown || breakdown.length === 0) return null;

  const matchCount = breakdown.filter(b => b.status === 'match').length;
  const issueCount = breakdown.length - matchCount;

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-[11px]">🔍</span>
          <span className="text-[11px] font-bold text-foreground">Size Breakdown</span>
          <span className="text-[10px] text-muted-foreground">
            {matchCount}/{breakdown.length} measurements match
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {issueCount > 0 && (
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
              {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
            </span>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="border border-border border-t-0 rounded-b-xl bg-card px-3 py-3 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {brandName || 'Brand'} · Size {recommendedSize}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground">
                {Math.round(confidence * 100)}% confidence
              </p>
            </div>

            {/* Column labels */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center px-0.5">
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">Measurement</span>
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider text-right w-14">You</span>
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider text-right w-20">Chart Range</span>
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider text-right w-12">Status</span>
            </div>

            {/* Rows */}
            {breakdown.map((item) => {
              const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.out_of_range;
              const Icon = config.icon;

              return (
                <div
                  key={item.key}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center rounded-lg px-2 py-1.5 ${config.bg} border ${config.border}`}
                >
                  <span className="text-[11px] font-bold text-foreground">
                    {LABELS[item.key] || item.key}
                  </span>
                  <span className={`text-[11px] font-bold text-right w-14 ${config.color}`}>
                    {item.user_value.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-muted-foreground text-right w-20">
                    {item.chart_min.toFixed(1)}–{item.chart_max.toFixed(1)}
                  </span>
                  <div className="flex items-center justify-end gap-1 w-12">
                    <Icon className={`h-3 w-3 ${config.color}`} />
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1.5 border-t border-border">
              {Object.entries(statusConfig).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex items-center gap-1">
                    <Icon className={`h-2.5 w-2.5 ${cfg.color}`} />
                    <span className="text-[9px] text-muted-foreground">{cfg.label}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Values shown include fit preference adjustments. Chart ranges are in cm.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SizeDiagnostic;
