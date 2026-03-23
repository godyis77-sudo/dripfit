import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CameraOff, ShoppingBag, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Fallback UI shown when camera permissions are denied.
 * Guides users to catalog browsing and community features instead.
 */
interface CameraFallbackBrowserProps {
  onRetryCamera?: () => void;
}

const CameraFallbackBrowser = ({ onRetryCamera }: CameraFallbackBrowserProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 p-6 text-center"
    >
      {/* Icon */}
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
        <CameraOff className="h-7 w-7 text-muted-foreground" />
      </div>

      <div>
        <h3 className="text-[15px] font-bold text-foreground mb-1">Camera Access Needed</h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[280px]">
          Enable camera access in your browser settings to use the try-on feature.
          In the meantime, explore these:
        </p>
      </div>

      {/* Alternative actions */}
      <div className="w-full max-w-[300px] space-y-2">
        <Button
          onClick={() => navigate('/browse/all')}
          className="w-full h-11 rounded-xl btn-luxury text-primary-foreground font-bold text-sm"
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          Browse 7,000+ Items
          <ArrowRight className="ml-auto h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate('/style-check')}
          className="w-full h-10 rounded-xl border-primary/30 text-foreground font-semibold text-[13px]"
        >
          <Users className="mr-2 h-4 w-4 text-primary" />
          Community Style Checks
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate('/tryon')}
          className="w-full h-10 rounded-xl border-primary/30 text-foreground font-semibold text-[13px]"
        >
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          Upload Photos Instead
        </Button>
      </div>

      {onRetryCamera && (
        <button
          onClick={onRetryCamera}
          className="text-[11px] font-semibold text-primary underline mt-2 active:opacity-70"
        >
          Try Enabling Camera Again
        </button>
      )}

      <p className="text-[10px] text-muted-foreground/60 max-w-[260px]">
        Tip: On iOS, go to Settings → Safari → Camera. On Android, tap the lock icon in your address bar.
      </p>
    </motion.div>
  );
};

export default CameraFallbackBrowser;
