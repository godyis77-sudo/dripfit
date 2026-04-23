import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bookmark, ExternalLink, Trash2, ShoppingBag, Shield, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AnimatePresence } from 'framer-motion';

import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import BottomTabBar from '@/components/BottomTabBar';
import { PriceWatchButton, PriceDropBadge, PriceDropNotificationsBell } from '@/components/pricing/PriceWatchUI';
import PriceDropsFeed from '@/components/pricing/PriceDropsFeed';
import { usePriceWatches } from '@/hooks/usePriceWatches';
import { usePageMeta } from '@/hooks/usePageMeta';

interface SavedItem {
  id: string;
  product_link: string | null;
  product_image_url: string | null;
  retailer: string | null;
  brand: string | null;
  category: string | null;
  size_recommendation: string | null;
  confidence: string | null;
  created_at: string;
}

const SavedItems = () => {
  usePageMeta({ title: 'Saved Items', description: 'Your bookmarked products with live price drop tracking.', path: '/saved' });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropsFeed, setShowDropsFeed] = useState(false);
  const { watches, unreadCount, getWatch } = usePriceWatches();

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) { setLoading(false); return; }
    const query = supabase.from('saved_items').select('*').eq('user_id', user.id);
    const { data } = await query.order('created_at', { ascending: false });
    setItems((data as SavedItem[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('saved_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    trackEvent('saved_item_removed');
    toast({ title: 'Removed' });
  };

  const handleShop = (item: SavedItem) => {
    trackEvent('shop_clickout', { retailer: item.retailer || '' });
    if (item.product_link) {
      window.open(item.product_link, '_blank', 'noopener');
    } else {
      toast({ title: 'No link saved', description: 'Add a product link to shop directly.' });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground flex items-center gap-1.5 uppercase">
              <Bookmark className="h-4 w-4 text-primary" /> Saved
            </h1>
            <p className="text-[10px] text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          {/* Price drops bell */}
          <button
            onClick={() => setShowDropsFeed(true)}
            className="h-10 w-10 rounded-lg flex items-center justify-center relative min-h-[44px] min-w-[44px]"
          >
            <PriceDropNotificationsBell />
            {unreadCount === 0 && <TrendingDown className="h-4 w-4 text-muted-foreground/40" />}
          </button>
        </div>

        {/* Price watches summary */}
        {watches.length > 0 && (
            <button
            onClick={() => setShowDropsFeed(true)}
            className="w-full flex items-center gap-3 rounded-xl glass-dark p-3 mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingDown className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="text-[12px] font-bold text-foreground">Price Alerts</p>
              <p className="text-[10px] text-muted-foreground">
                Watching {watches.length} item{watches.length !== 1 ? 's' : ''}
                {unreadCount > 0 && ` · ${unreadCount} drop${unreadCount !== 1 ? 's' : ''}`}
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="h-5 min-w-[20px] px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-card border border-border rounded-xl skeleton-gold" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Bookmark className="h-6 w-6 text-primary/50" />
            </div>
            <p className="text-[14px] font-bold text-foreground mb-1">No saved items</p>
            <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">
              Save items from your Results to keep track of what you want to buy.
            </p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/capture')}>
              Start a Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              // Check if this item has an active price watch
              const watch = watches.find(w => w.product_url === item.product_link || w.product_name === item.brand);
              return (
                <div key={item.id} className="glass-dark rounded-xl p-3">
                  <div className="flex gap-3">
                    <img
                      src={item.product_image_url || '/placeholder.svg'}
                      alt={item.brand || item.category || 'Product'}
                      className="w-16 h-16 object-cover rounded-lg bg-muted shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        {item.retailer && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                            {item.retailer}
                          </span>
                        )}
                        {item.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground capitalize">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-bold text-foreground">
                        Size {item.size_recommendation || '—'} · <span className="font-normal text-muted-foreground capitalize">{item.confidence || 'Unknown'} confidence</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Saved {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      {/* Price drop badge */}
                      {watch && watch.current_price_cents < watch.original_price_cents && (
                        <div className="mt-1">
                          <PriceDropBadge
                            originalPriceCents={watch.original_price_cents}
                            currentPriceCents={watch.current_price_cents}
                            currency={watch.currency}
                          />
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 self-start shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      className="flex-1 h-8 rounded-lg btn-luxury text-primary-foreground text-[10px] font-bold"
                      onClick={() => handleShop(item)}
                    >
                      <ShoppingBag className="mr-1 h-3 w-3" /> Shop Now
                      {item.product_link && <ExternalLink className="ml-1 h-2.5 w-2.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}

            <p className="text-[11px] text-muted-foreground/60 text-center mt-3">
              We may earn a commission. It doesn't change your price.
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1 mt-4">
          <Shield className="h-3 w-3" /> Private by default · delete anytime
        </p>
      </div>

      {/* Price drops feed overlay */}
      <AnimatePresence>
        {showDropsFeed && <PriceDropsFeed onClose={() => setShowDropsFeed(false)} />}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  );
};

export default SavedItems;
