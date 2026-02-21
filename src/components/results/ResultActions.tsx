import { Button } from '@/components/ui/button';
import { Shirt, Save, Check, Trash2, RotateCcw, Shield } from 'lucide-react';

interface ResultActionsProps {
  saved: boolean;
  scanDate: string;
  onSave: () => void;
  onTryOn: () => void;
  onNewScan: () => void;
  onDelete: () => void;
}

const ResultActions = ({ saved, scanDate, onSave, onTryOn, onNewScan, onDelete }: ResultActionsProps) => {
  return (
    <div className="space-y-2.5 mt-4">
      {/* Primary CTA */}
      <Button
        className="w-full h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground"
        onClick={onTryOn}
      >
        <Shirt className="mr-2 h-4 w-4" /> Use for Try-On
      </Button>

      {/* Secondary */}
      <Button
        variant="outline"
        className="w-full h-11 rounded-xl text-sm"
        onClick={onSave}
        disabled={saved}
      >
        {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
        {saved ? 'Body Profile Saved' : 'Save Body Profile'}
      </Button>

      {/* Tertiary */}
      <Button
        variant="ghost"
        className="w-full text-xs text-muted-foreground h-9"
        onClick={onNewScan}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start New Scan
      </Button>

      {/* Privacy row */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Shield className="h-3 w-3" /> Private by default • delete anytime
        </p>
        <button
          onClick={onDelete}
          className="text-[10px] text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors"
        >
          <Trash2 className="h-3 w-3" /> Delete photos
        </button>
      </div>

      {/* Timestamp */}
      <p className="text-[10px] text-muted-foreground text-center">
        Last scan: {new Date(scanDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

export default ResultActions;
