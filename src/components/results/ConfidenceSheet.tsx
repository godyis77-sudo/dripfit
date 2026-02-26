import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { Confidence } from '@/lib/types';

interface ConfidenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confidence: Confidence;
}

const CONFIDENCE_DATA: Record<Confidence, {
  title: string;
  explanation: string;
  icon: typeof Info;
  iconClass: string;
  headerClass: string;
  cta?: { label: string; variant: 'default' | 'outline' };
}> = {
  high: {
    title: 'High Confidence',
    explanation: 'Your measurements are highly accurate. Both photos were clear, well-lit, and showed your full body. This size recommendation will be very precise.',
    icon: CheckCircle,
    iconClass: 'text-green-500',
    headerClass: 'text-green-500',
  },
  medium: {
    title: 'Medium Confidence',
    explanation: 'Good accuracy with room to improve. For better results: use a plain wall background, wear form-fitting clothes, and ensure your full body (head to feet) is visible in both photos.',
    icon: Info,
    iconClass: 'text-primary',
    headerClass: 'text-primary',
    cta: { label: 'Rescan for Higher Accuracy', variant: 'outline' },
  },
  low: {
    title: 'Low Confidence',
    explanation: 'We had trouble reading your measurements accurately. Please rescan with better lighting, a plain background, and fitted clothing. Your size recommendation may be off by 1 size.',
    icon: AlertTriangle,
    iconClass: 'text-orange-500',
    headerClass: 'text-orange-500',
    cta: { label: 'Rescan Now', variant: 'default' },
  },
};

const ConfidenceSheet = ({ open, onOpenChange, confidence }: ConfidenceSheetProps) => {
  const navigate = useNavigate();
  const data = CONFIDENCE_DATA[confidence];
  const Icon = data.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-2xl px-5 pb-8 pt-4">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center bg-background border border-border`}>
                <Icon className={`h-5 w-5 ${data.iconClass}`} />
              </div>
              <SheetTitle className={`text-base font-bold ${data.headerClass}`}>
                {data.title}
              </SheetTitle>
            </div>
            <button onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </SheetHeader>

        <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
          {data.explanation}
        </p>

        {data.cta && (
          <Button
            variant={data.cta.variant}
            className="w-full rounded-xl h-11 text-sm font-bold"
            onClick={() => { onOpenChange(false); navigate('/capture'); }}
          >
            {data.cta.label}
          </Button>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ConfidenceSheet;
