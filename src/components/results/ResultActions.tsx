import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shirt, Save, Check, Trash2, RotateCcw, Shield, MessageSquare, Bookmark, Sparkles } from 'lucide-react';

interface ResultActionsProps {
  saved: boolean;
  scanDate: string;
  onSave: () => void;
  onTryOn: () => void;
  onNewScan: () => void;
  onDelete: () => void;
  onSaveForLater?: () => void;
  savedForLater?: boolean;
  recommendedSize?: string;
}

const ResultActions = ({ saved, scanDate, onSave, onTryOn, onNewScan, onDelete, onSaveForLater, savedForLater, recommendedSize }: ResultActionsProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 mt-3">
      {/* PRIMARY TIER — full-width gold buttons */}
      <Button
        className="w-full h-12 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
        onClick={onTryOn}
      >
        <Sparkles className="mr-1.5 h-4 w-4" /> Try On This Item
      </Button>

      {/* SECONDARY TIER — 2×2 grid */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onSaveForLater}
          disabled={savedForLater}
          className="flex items-center justify-center gap-1.5 h-[44px] rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          style={{
            background: '#1A1A1A',
            border: '1px solid #B8960C',
            color: '#B8960C',
            fontSize: '14px',
          }}
        >
          {savedForLater ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {savedForLater ? 'Saved' : 'Save for Later'}
        </button>

        <button
          onClick={() => navigate('/style-check')}
          className="flex items-center justify-center gap-1.5 h-[44px] rounded-lg text-sm font-medium transition-colors"
          style={{
            background: '#1A1A1A',
            border: '1px solid #B8960C',
            color: '#B8960C',
            fontSize: '14px',
          }}
        >
          <MessageSquare className="h-4 w-4" />
          Ask Fit Check
        </button>

        <button
          onClick={onSave}
          disabled={saved}
          className="flex items-center justify-center gap-1.5 h-[44px] rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          style={{
            background: '#1A1A1A',
            border: '1px solid #B8960C',
            color: '#B8960C',
            fontSize: '14px',
          }}
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save to Profile'}
        </button>

        <button
          onClick={onNewScan}
          className="flex items-center justify-center gap-1.5 h-[44px] rounded-lg text-sm font-medium transition-colors"
          style={{
            background: '#1A1A1A',
            border: '1px solid #B8960C',
            color: '#B8960C',
            fontSize: '14px',
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Scan Again
        </button>
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Private by default · delete anytime</p>
        <button onClick={onDelete} className="text-[10px] text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Scanned: {new Date(scanDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
};

export default ResultActions;
