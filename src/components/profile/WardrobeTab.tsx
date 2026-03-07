import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, Sparkles, Store, ExternalLink, Trash2, MoreHorizontal } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { getBestRetailerForItem } from '@/lib/retailerLinks';
import WardrobeDetailSheet from './WardrobeDetailSheet';

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  product_link: string | null;
  retailer: string | null;
  brand: string | null;
  notes: string | null;
  created_at: string;
}

interface WardrobeTabProps {
  wardrobeItems: WardrobeItem[];
  onDeleteItem: (id: string) => void;
  favoriteRetailers: string[];
}

const WardrobeTab = ({ wardrobeItems, onDeleteItem, favoriteRetailers }: WardrobeTabProps) => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = useCallback((id: string) => {
    longPressTimer.current = setTimeout(() => setLongPressId(id), 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  // Dismiss long-press menu on outside tap
  useEffect(() => {
    if (!longPressId) return;
    const handler = () => setLongPressId(null);
    const t = setTimeout(() => document.addEventListener('pointerdown', handler, { once: true }), 50);
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', handler); };
  }, [longPressId]);

  return (
    <>
      
      {wardrobeItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Shirt className="h-6 w-6 text-primary/60" />
          </div>
          <h2 className="text-[18px] font-bold text-foreground mb-1">Your wardrobe is empty</h2>
          <p className="text-[14px] text-muted-foreground max-w-[260px] mb-5">Save clothing items to try on and track your fits.</p>
          <Button className="rounded-full btn-luxury text-primary-foreground text-sm h-11 px-6 font-bold" onClick={() => navigate('/')}>
            Browse Items
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {wardrobeItems.map(item => {
            const displayRetailer = item.retailer || (favoriteRetailers.length > 0 ? favoriteRetailers[0] : getBestRetailerForItem(item.brand, item.category));
            return (
              <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <div
                  className="relative rounded-xl overflow-hidden border border-border bg-card text-left"
                  onPointerDown={() => handlePointerDown(item.id)}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <button
                    onClick={() => { if (!longPressId) setSelectedItem(item); }}
                    className="w-full text-left active:scale-[0.97] transition-transform"
                  >
                    {/* Image area — 3:4 aspect ratio */}
                    <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                      <img src={item.image_url} alt={item.notes || item.category} className="w-full h-full object-cover" loading="lazy" />
                      {item.product_link && (
                        <div className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-sm rounded-full p-1">
                          <ExternalLink className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {/* Brand/retailer pill — bottom right of image */}
                      {(displayRetailer || item.brand) && (
                        <div className="absolute bottom-1.5 right-1.5 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                          <span className="text-[8px] font-bold text-foreground uppercase tracking-wider">
                            {displayRetailer || item.brand}
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Info area */}
                    <div className="p-2.5 flex flex-col">
                      {item.brand && (
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{item.brand}</p>
                      )}
                      <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight h-[28px] capitalize">
                        {item.notes || item.category}
                      </p>
                      <p className="text-[12px] font-bold text-primary mt-1">
                        {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </button>

                  {/* Long-press action row */}
                  <AnimatePresence>
                    {longPressId === item.id && (
                      <motion.div
                        initial={{ y: 8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 8, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute bottom-0 left-0 right-0 flex gap-1 p-1.5 bg-card/95 backdrop-blur-sm border-t border-border"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => { setLongPressId(null); navigate('/tryon'); }}
                          className="flex-1 py-1.5 rounded-lg bg-background border border-border text-[9px] font-bold text-foreground active:scale-95 transition-transform"
                        >
                          Try On
                        </button>
                        <button
                          onClick={() => { setLongPressId(null); }}
                          className="flex-1 py-1.5 rounded-lg bg-background border border-border text-[9px] font-bold text-foreground active:scale-95 transition-transform"
                        >
                          Wishlist
                        </button>
                        <button
                          onClick={() => { setLongPressId(null); onDeleteItem(item.id); }}
                          className="flex-1 py-1.5 rounded-lg bg-background border border-destructive/30 text-[9px] font-bold text-destructive active:scale-95 transition-transform"
                        >
                          Remove
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <WardrobeDetailSheet
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
        onDelete={(id) => { onDeleteItem(id); setSelectedItem(null); }}
        favoriteRetailers={favoriteRetailers}
      />
    </>
  );
};

export default WardrobeTab;
