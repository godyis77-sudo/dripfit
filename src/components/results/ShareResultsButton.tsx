import { useState } from 'react';
import { Share, Download, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { generateShareImage } from '@/lib/shareImage';
import { trackEvent } from '@/lib/analytics';
import type { MeasurementRange } from '@/lib/types';

interface ShareResultsButtonProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
  recommendedSize: string;
  fitPreference: string;
  variant?: 'button' | 'icon';
}

const SHARE_TEXT = "I just got my exact measurements across every brand. Measured with DRIPFITCHECK — try it free: dripfitcheck.lovable.app";
const SHARE_URL = "https://dripfitcheck.lovable.app";

const ShareResultsButton = ({ measurements, heightCm, recommendedSize, fitPreference, variant = 'button' }: ShareResultsButtonProps) => {
  const [generating, setGenerating] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleShare = async () => {
    setGenerating(true);
    try {
      const blob = await generateShareImage({ measurements, heightCm, recommendedSize, fitPreference });
      const file = new File([blob], 'drip-fit-results.png', { type: 'image/png' });

      trackEvent('scan_results_shared' as any, { method: navigator.share ? 'native' : 'fallback' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          text: SHARE_TEXT,
          url: SHARE_URL,
          files: [file],
        });
      } else {
        // Fallback modal
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        setFallbackOpen(true);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast({ title: 'Share failed', description: 'Could not generate share image.' });
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'drip-fit-results.png';
    a.click();
    trackEvent('scan_results_shared' as any, { method: 'download' });
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(SHARE_URL);
    toast({ title: 'Link copied!', description: 'Share it with your friends.' });
    trackEvent('scan_results_shared' as any, { method: 'copy_link' });
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        disabled={generating}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        aria-label="Share measurements"
      >
        <Share className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleShare}
        disabled={generating}
        className="w-full h-11 rounded-xl border-primary/30 text-primary hover:bg-primary/5 font-bold text-sm"
      >
        <Share className="mr-2 h-4 w-4" />
        {generating ? 'Generating…' : 'Share My Results'}
      </Button>

      <Dialog open={fallbackOpen} onOpenChange={(open) => { if (!open) { setFallbackOpen(false); if (imageUrl) { URL.revokeObjectURL(imageUrl); setImageUrl(null); } } }}>
        <DialogContent className="max-w-[320px] bg-card border-border p-4 rounded-2xl">
          <DialogTitle className="text-foreground text-sm font-bold mb-3 text-center">
            Share Your Results
          </DialogTitle>

          {imageUrl && (
            <div className="w-full rounded-xl overflow-hidden border border-border mb-4"
              style={{ aspectRatio: '9/16' }}>
              <img
                src={imageUrl}
                alt="Shareable measurement results"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center mb-3">
            Save the image, then share to Instagram Stories, WhatsApp or anywhere.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleDownload}
              className="w-full h-11 rounded-xl btn-luxury text-primary-foreground font-bold"
            >
              <Download className="mr-2 h-4 w-4" /> Save to Photos
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="w-full h-10 rounded-xl border-primary/30 text-primary text-sm font-semibold"
            >
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareResultsButton;
