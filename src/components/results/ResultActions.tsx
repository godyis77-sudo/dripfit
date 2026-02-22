import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shirt, Save, Check, Trash2, RotateCcw, Shield, ShoppingBag, MessageSquare, Bookmark } from 'lucide-react';

interface ResultActionsProps {
  saved: boolean;
  scanDate: string;
  onSave: () => void;
  onTryOn: () => void;
  onNewScan: () => void;
  onDelete: () => void;
  recommendedSize?: string;
}

const ResultActions = ({ saved, scanDate, onSave, onTryOn, onNewScan, onDelete, recommendedSize }: ResultActionsProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-2 mt-3">
      {/* Primary: Shop This Size (handled by ShopThisSize component above) */}

      {/* Secondary: Try-On */}
      <Button
        variant={saved ? 'default' : 'outline'}
        className={`w-full h-10 rounded-lg text-sm font-bold ${saved ? 'btn-luxury text-primary-foreground' : ''}`}
        onClick={onTryOn}
      >
        <Shirt className="mr-1.5 h-4 w-4" /> Try-On This Item
      </Button>

      {/* Tertiary: Ask Fit Check */}
      <Button
        variant="outline"
        className="w-full h-9 rounded-lg text-[12px] font-bold"
        onClick={() => navigate('/community')}
      >
        <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Ask Fit Check
      </Button>

      {/* Save / Saved confirmation */}
      {!saved ? (
        <Button variant="outline" className="w-full h-9 rounded-lg text-[11px] font-bold" onClick={onSave}>
          <Save className="mr-1.5 h-3.5 w-3.5" /> Save to Profile
        </Button>
      ) : (
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary">Saved to Profile</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 rounded-lg text-[11px] font-medium"
            onClick={() => navigate('/saved')}
          >
            <Bookmark className="mr-1 h-3 w-3" /> View Saved Items
          </Button>
        </div>
      )}

      <Button variant="ghost" className="w-full text-[12px] text-muted-foreground h-8" onClick={onNewScan}>
        <RotateCcw className="mr-1 h-3 w-3" /> Scan Again
      </Button>

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
