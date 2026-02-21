import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface AlternativeSizesProps {
  sizeDown: string;
  sizeUp: string;
  best: string;
}

const AlternativeSizes = ({ sizeDown, sizeUp, best }: AlternativeSizesProps) => {
  const hasDown = sizeDown !== best;
  const hasUp = sizeUp !== best;

  if (!hasDown && !hasUp) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="mb-5"
    >
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Alternatives</p>
      <div className="grid grid-cols-2 gap-3">
        {hasDown && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">{sizeDown}</p>
              <p className="text-[10px] text-muted-foreground">If you want it tighter</p>
            </div>
          </div>
        )}
        {hasUp && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">{sizeUp}</p>
              <p className="text-[10px] text-muted-foreground">If you want it looser</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AlternativeSizes;
