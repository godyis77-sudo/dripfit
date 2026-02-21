import { Button } from '@/components/ui/button';
import { Shirt, Save, Check, Trash2, RotateCcw, Shield } from 'lucide-react';

interface ResultActionsProps { saved: boolean; scanDate: string; onSave: () => void; onTryOn: () => void; onNewScan: () => void; onDelete: () => void; }

const ResultActions = ({ saved, scanDate, onSave, onTryOn, onNewScan, onDelete }: ResultActionsProps) => (
  <div className="space-y-2 mt-3">
    <Button className="w-full h-10 rounded-lg text-sm font-bold btn-luxury text-primary-foreground" onClick={onTryOn}>
      <Shirt className="mr-1.5 h-4 w-4" /> Use for Try-On
    </Button>
    <Button variant="outline" className="w-full h-9 rounded-lg text-[13px]" onClick={onSave} disabled={saved}>
      {saved ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
      {saved ? 'Saved' : 'Save Profile'}
    </Button>
    <Button variant="ghost" className="w-full text-[12px] text-muted-foreground h-8" onClick={onNewScan}>
      <RotateCcw className="mr-1 h-3 w-3" /> New Scan
    </Button>
    <div className="flex items-center justify-between pt-1.5 border-t border-border">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Private · delete anytime</p>
      <button onClick={onDelete} className="text-[10px] text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>
    </div>
    <p className="text-[10px] text-muted-foreground text-center">
      Last scan: {new Date(scanDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </p>
  </div>
);

export default ResultActions;
