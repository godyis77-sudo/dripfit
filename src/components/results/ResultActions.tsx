import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shirt, Save, Check, Trash2, RotateCcw, Shield, Share, MessageSquare, LayoutGrid } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import type { MeasurementRange } from '@/lib/types';
import SocialExportCard from './SocialExportCard';

interface ResultActionsProps {
  saved: boolean;
  scanDate: string;
  onSave: () => void;
  onTryOn: () => void;
  onNewScan: () => void;
  onDelete: () => void;
  recommendedSize?: string;
  measurements?: Record<string, MeasurementRange>;
  heightCm?: number;
  shareOnly?: boolean;
}

const ResultActions = ({ saved, scanDate, onSave, onTryOn, onNewScan, onDelete, recommendedSize, measurements, heightCm, shareOnly }: ResultActionsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!measurements || !heightCm || !recommendedSize) return;
    setSharing(true);

    toast({
      title: '✨ Generating your Fit Identity...',
      description: 'Scaling for HQ share.',
    });

    try {
      await new Promise(r => setTimeout(r, 300));

      if (!exportRef.current) {
        throw new Error('Export card not ready');
      }

      const el = exportRef.current;
      el.style.opacity = '1';
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '0';
      await new Promise(r => setTimeout(r, 100));

      const dataUrl = await toPng(el, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: true,
      });

      el.style.opacity = '0';
      el.style.position = 'absolute';

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'dripfit-founding100.png', { type: 'image/png' });

      trackEvent('founding100_share_generated' as any, { method: navigator.share ? 'native' : 'download' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          text: "I just got my exact measurements with DRIPFIT ✔ — Founding 100 Member. Try it free: dripfitcheck.lovable.app",
          files: [file],
        });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'dripfit-founding100.png';
        a.click();
        toast({ title: 'Image saved!', description: 'Share it on your Stories.' });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast({ title: 'Share failed', description: 'Please try again.' });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-2 mt-3">
      {/* Share — glass-gold */}
      {measurements && heightCm && recommendedSize && (
        <>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full h-11 rounded-xl bg-primary/8 backdrop-blur-md border border-primary/20 text-primary font-semibold text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <Share className="h-4 w-4 text-primary/70" />
            {sharing ? 'Generating…' : 'Share My Fit Identity'}
          </button>

          <SocialExportCard
            ref={exportRef}
            measurements={measurements}
            heightCm={heightCm}
            recommendedSize={recommendedSize}
          />
        </>
      )}

      {!shareOnly && (
        <>
          <div className="flex items-center gap-2 px-3 py-1">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary">Auto-saved to Profile</span>
          </div>

          <button
            className="w-full flex items-center justify-center gap-1 text-[12px] text-white/50 h-8 bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg hover:bg-white/8 transition-colors"
            onClick={onNewScan}
          >
            <RotateCcw className="h-3 w-3" /> Scan Again
          </button>

          <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
            <p className="text-[10px] text-white/25 flex items-center gap-1"><Shield className="h-3 w-3" /> Private by default · delete anytime</p>
            <button onClick={onDelete} className="text-[10px] text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>
          </div>
          <p className="text-[10px] text-white/20 text-center">
            Scanned: {new Date(scanDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </>
      )}
    </div>
  );
};

export default ResultActions;
