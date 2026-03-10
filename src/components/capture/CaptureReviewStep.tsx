import { motion } from 'framer-motion';
import { Check, Ruler } from 'lucide-react';
import { PhotoSet, REFERENCE_OBJECTS, ReferenceObject } from '@/lib/types';

interface CaptureReviewStepProps {
  photos: PhotoSet;
  checklist: { label: string; done: boolean }[];
  heightCm: number;
  refObject: ReferenceObject;
  onRetake: (key: 'front' | 'side') => void;
  onEditHeight: () => void;
}

const CaptureReviewStep = ({
  photos, checklist, heightCm, refObject, onRetake, onEditHeight,
}: CaptureReviewStepProps) => (
  <motion.div key="review-final" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm">
    <h2 className="text-lg font-bold text-foreground mb-1">Ready to Analyze</h2>
    <p className="text-[12px] text-muted-foreground mb-4">Review your inputs before we estimate your measurements.</p>

    <div className="space-y-2 mb-4">
      {checklist.map((c) => (
        <div key={c.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors min-h-[44px] ${
          c.done ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
        }`}>
          <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
            c.done ? 'bg-primary' : 'border border-border'
          }`}>
            {c.done && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
          <span className={`text-[13px] font-medium ${c.done ? 'text-foreground' : 'text-muted-foreground'}`}>{c.label}</span>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-2 mb-4">
      {(['front', 'side'] as const).map((key) => (
        <div key={key} className="relative">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{key} view</p>
          <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border bg-card">
            {photos[key] ? (
              <img src={photos[key]!} alt={`${key} view`} className="w-full h-full object-cover img-normalize" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[11px]">Missing</div>
            )}
          </div>
          {photos[key] && (
            <button
              onClick={() => onRetake(key)}
              className="absolute top-6 right-1 bg-card/80 backdrop-blur rounded-lg px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[28px]"
            >
              Retake
            </button>
          )}
        </div>
      ))}
    </div>

    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 mb-4 min-h-[44px]">
      <Ruler className="h-3.5 w-3.5 text-primary" />
      <span className="text-[12px] text-foreground font-medium">Height: {heightCm} cm</span>
      <button onClick={onEditHeight} className="ml-auto text-[10px] text-primary font-medium min-h-[44px] flex items-center">Edit</button>
    </div>

    {refObject !== 'none' && (
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 mb-4 min-h-[44px]">
        <Ruler className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12px] text-foreground font-medium">Ref: {REFERENCE_OBJECTS[refObject].label}</span>
      </div>
    )}
  </motion.div>
);

export default CaptureReviewStep;
