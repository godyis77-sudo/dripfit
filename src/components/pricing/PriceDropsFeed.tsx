import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingDown, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePriceWatches, PriceDropNotification } from '@/hooks/usePriceWatches';

function formatPrice(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

interface PriceDropsFeedProps {
  onClose: () => void;
}

export default function PriceDropsFeed({ onClose }: PriceDropsFeedProps) {
  const { drops, watches, markRead, markAllRead } = usePriceWatches();

  const enriched = drops.map(d => {
    const watch = watches.find(w => w.id === d.watch_id);
    return { ...d, watch };
  });

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-green-500" />
          <h2 className="text-sm font-bold text-foreground">Price Drops</h2>
          {drops.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-bold">
              {drops.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {drops.length > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-[11px] text-primary font-bold"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
        {enriched.length === 0 ? (
          <div className="text-center py-16">
            <TrendingDown className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No price drops yet</p>
            <p className="text-[12px] text-muted-foreground">Watch items and we'll notify you when prices drop.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {enriched.map(notif => (
              <div
                key={notif.id}
                className="rounded-xl border border-green-500/20 bg-green-500/5 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-foreground truncate">
                      {notif.watch?.product_name || notif.watch?.brand || 'Product'}
                    </p>
                    {notif.watch?.brand && (
                      <p className="text-[10px] text-muted-foreground">{notif.watch.brand}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground line-through">
                        {formatPrice(notif.old_price_cents)}
                      </span>
                      <span className="text-[12px] font-bold text-green-600 dark:text-green-400">
                        {formatPrice(notif.new_price_cents)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-600 font-bold">
                        -{notif.drop_percent}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(notif.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => markRead.mutate(notif.id)}
                    className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0"
                  >
                    <Check className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
                {notif.watch?.product_url && (
                  <Button
                    size="sm"
                    className="w-full mt-2 h-8 btn-luxury text-[10px]"
                    onClick={() => window.open(notif.watch!.product_url!, '_blank')}
                  >
                    Shop Now — {formatPrice(notif.new_price_cents)}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
