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
}

const ResultActions = ({ saved, scanDate, onSave, onTryOn, onNewScan, onDelete, recommendedSize, measurements, heightCm }: ResultActionsProps) => {
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
      // Small delay so the export card renders
      await new Promise(r => setTimeout(r, 300));

      if (!exportRef.current) {
        throw new Error('Export card not ready');
      }

      // Temporarily make visible for capture
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

      // Hide again
      el.style.opacity = '0';
      el.style.position = 'absolute';

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'dripfit-founding50.png', { type: 'image/png' });

      trackEvent('founding50_share_generated' as any, { method: navigator.share ? 'native' : 'download' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          text: "I just got my exact measurements with DRIPFIT ✔ — Founding 50 Member. Try it free: dripfitcheck.lovable.app",
          files: [file],
        });
      } else {
        // Desktop fallback: direct download
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'dripfit-founding50.png';
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
      {/* Primary: Share Founding 50 Card */}
      {measurements && heightCm && recommendedSize && (
        <>
          <Button
            onClick={handleShare}
            disabled={sharing}
            className="w-full h-11 rounded-xl btn-luxury text-primary-foreground font-bold text-sm"
          >
            <Share className="mr-2 h-4 w-4" />
            {sharing ? 'Generating…' : 'Share My Fit Identity'}
          </Button>

          {/* Hidden export card */}
          <SocialExportCard
            ref={exportRef}
            measurements={measurements}
            heightCm={heightCm}
            recommendedSize={recommendedSize}
          />
        </>
      )}

      {/* Saved indicator (auto-saved) */}
      <div className="flex items-center gap-2 px-3 py-1">
        <Check className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold text-primary">Auto-saved to Profile</span>
      </div>

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
