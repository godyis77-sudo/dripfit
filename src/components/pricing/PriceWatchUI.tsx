import { TrendingDown, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriceWatches } from '@/hooks/usePriceWatches';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

function formatPrice(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

interface PriceWatchButtonProps {
  productId: string;
  productName?: string;
  brand?: string;
  productUrl?: string;
  priceCents: number;
  currency?: string;
}

export function PriceWatchButton({ productId, productName, brand, productUrl, priceCents, currency }: PriceWatchButtonProps) {
  const { isWatching, getWatch, addWatch, removeWatch } = usePriceWatches();
  const { toast } = useToast();
  const watching = isWatching(productId);
  const watch = getWatch(productId);

  const handleToggle = async () => {
    if (watching && watch) {
      removeWatch.mutate(watch.id);
      toast({ title: 'Price alert removed' });
      trackEvent('price_watch_removed');
    } else {
      addWatch.mutate({
        product_id: productId,
        product_name: productName,
        brand,
        product_url: productUrl,
        price_cents: priceCents,
        currency,
      });
      toast({ title: '🔔 Watching price', description: `We'll alert you if ${brand || 'this item'} drops.` });
      trackEvent('price_watch_added' as any);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={addWatch.isPending || removeWatch.isPending}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
        watching
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'bg-muted text-muted-foreground border border-border'
      }`}
    >
      {watching ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
      {watching ? 'Watching' : 'Watch Price'}
    </button>
  );
}

interface PriceDropBadgeProps {
  originalPriceCents: number;
  currentPriceCents: number;
  currency?: string;
}

export function PriceDropBadge({ originalPriceCents, currentPriceCents, currency = 'USD' }: PriceDropBadgeProps) {
  if (currentPriceCents >= originalPriceCents) return null;
  const dropPercent = Math.round(((originalPriceCents - currentPriceCents) / originalPriceCents) * 100);
  if (dropPercent < 5) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20"
    >
      <TrendingDown className="h-3 w-3 text-green-500" />
      <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
        {dropPercent}% off · Now {formatPrice(currentPriceCents, currency)}
      </span>
    </motion.div>
  );
}

export function PriceDropNotificationsBell() {
  const { unreadCount } = usePriceWatches();
  if (unreadCount === 0) return null;

  return (
    <div className="relative">
      <TrendingDown className="h-4 w-4 text-green-500" />
      <span className="absolute -top-1 -right-1 h-3.5 min-w-[14px] rounded-full bg-green-500 text-[8px] font-bold text-white flex items-center justify-center px-0.5">
        {unreadCount}
      </span>
    </div>
  );
}
