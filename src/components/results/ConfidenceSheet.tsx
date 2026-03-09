import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Info, X, Camera } from 'lucide-react';

interface ConfidenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confidence: string;
}

const ConfidenceSheet = ({ open, onOpenChange, confidence }: ConfidenceSheetProps) => {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-2xl px-5 pb-8 pt-4">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-background border border-border">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <SheetTitle className="text-base font-bold text-foreground">
                What is scan confidence?
              </SheetTitle>
            </div>
            <button onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" aria-label="Close">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </SheetHeader>

        <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
          Confidence shows how precisely your photos captured your measurements.
          Higher confidence = more accurate size recommendations.
          To improve: good lighting, form-fitting clothing, a plain wall behind you.
        </p>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full rounded-xl h-11 text-sm font-bold btn-luxury text-primary-foreground"
            onClick={() => { onOpenChange(false); navigate('/capture'); }}
          >
            <Camera className="mr-1.5 h-4 w-4" /> Update My Scan
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-xl h-11 text-sm font-bold"
            onClick={() => onOpenChange(false)}
          >
            Got it
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ConfidenceSheet;
