import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Link2, MessageCircle, Check, X, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

interface ShareNudgeProps {
  postId: string;
  resultImage: string;
  caption?: string;
  onDismiss: () => void;
  onShareStory?: () => void;
}

/**
 * Post-generation share nudge — appears after a try-on is saved.
 * One-tap options: Copy Link, Share (native), Instagram Story export.
 */
export default function ShareNudge({ postId, resultImage, caption, onDismiss, onShareStory }: ShareNudgeProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/style-check/${postId}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    trackEvent('share_nudge_copy_link', { postId });
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    trackEvent('share_nudge_native', { postId });
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out my fit on DripFit',
          text: caption || 'Check out this virtual try-on!',
          url: shareUrl,
        });
      } else {
        handleCopyLink();
      }
    } catch { /* user cancelled */ }
  };

  const handleWhatsApp = () => {
    trackEvent('share_nudge_whatsapp', { postId });
    const text = encodeURIComponent(`${caption || 'Check out my fit!'} ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card border border-border rounded-xl p-3 mt-3"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-foreground">Share this look? 🔥</p>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1" aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="flex-1 h-9 rounded-lg text-[11px] font-semibold gap-1.5"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsApp}
          className="h-9 rounded-lg text-[11px] font-semibold gap-1.5 px-3"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        {onShareStory && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShareStory}
            className="h-9 rounded-lg text-[11px] font-semibold gap-1.5 px-3"
          >
            <Instagram className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleNativeShare}
          className="h-9 rounded-lg text-[11px] font-bold gap-1.5 btn-luxury text-primary-foreground px-3"
        >
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
      </div>
    </motion.div>
  );
}
