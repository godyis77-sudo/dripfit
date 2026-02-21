import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface AlternativeSizesProps { sizeDown: string; sizeUp: string; best: string; }

const AlternativeSizes = ({ sizeDown, sizeUp, best }: AlternativeSizesProps) => {
  const hasDown = sizeDown !== best;
  const hasUp = sizeUp !== best;
  if (!hasDown && !hasUp) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-4">
      <p className="section-label mb-1.5">Alternatives</p>
      <div className="grid grid-cols-2 gap-2">
        {hasDown && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2.5 py-2">
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-foreground">{sizeDown}</p>
              <p className="text-[10px] text-muted-foreground">Tighter fit</p>
            </div>
          </div>
        )}
        {hasUp && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2.5 py-2">
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-foreground">{sizeUp}</p>
              <p className="text-[10px] text-muted-foreground">Looser fit</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AlternativeSizes;
