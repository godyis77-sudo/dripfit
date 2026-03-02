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
      <p className="text-[11px] text-muted-foreground mb-3">Your saved clothing and potential buys.</p>
      {wardrobeItems.length === 0 ? (
        <div className="text-center py-8">
          <div className="relative mx-auto w-32 h-36 mb-4">
            <div className="absolute inset-x-2 top-0 h-1.5 rounded-full bg-muted" />
            <div className="absolute left-4 top-1.5 w-0.5 h-8 bg-muted" />
            <div className="absolute right-4 top-1.5 w-0.5 h-8 bg-muted" />
            <div className="absolute inset-x-0 top-10 bottom-0 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1">
              <Shirt className="h-8 w-8 text-muted-foreground/20" />
              <div className="flex gap-1">
                <div className="w-1.5 h-6 rounded-full bg-primary/10" />
                <div className="w-1.5 h-8 rounded-full bg-primary/15" />
                <div className="w-1.5 h-5 rounded-full bg-primary/10" />
                <div className="w-1.5 h-7 rounded-full bg-primary/12" />
              </div>
            </div>
          </div>
          <p className="text-[15px] font-bold text-foreground mb-1">Your dream closet starts here</p>
          <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">Save clothing from Try-On sessions to build your personal wardrobe.</p>
          <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/tryon')}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Start Try-On
          </Button>
        </div>
      ) : (
        <div className="columns-2 gap-2 space-y-2">
          {wardrobeItems.map(item => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="break-inside-avoid">
              <div
                className="relative w-full rounded-xl overflow-hidden border border-border bg-card text-left"
                onPointerDown={() => handlePointerDown(item.id)}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <button
                  onClick={() => { if (!longPressId) setSelectedItem(item); }}
                  className="w-full text-left active:scale-[0.97] transition-transform"
                >
                  <div className="relative">
                    <img src={item.image_url} alt={item.notes || item.category} className="w-full object-cover" />
                    {item.product_link && (
                      <div className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-sm rounded-full p-1">
                        <ExternalLink className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {(() => {
                      const displayRetailer = item.retailer || (favoriteRetailers.length > 0 ? favoriteRetailers[0] : getBestRetailerForItem(item.brand, item.category));
                      return displayRetailer ? (
                        <div className="absolute bottom-1.5 right-1.5 bg-primary rounded-md px-2 py-0.5 shadow-lg border border-primary-foreground/20">
                          <span className="text-[9px] font-extrabold text-primary-foreground uppercase tracking-wide">{displayRetailer}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="p-2 space-y-0.5">
                    <p className="text-[11px] font-bold text-foreground capitalize truncate">
                      {item.notes || item.category}
                    </p>
                    {item.brand && (
                      <p className="text-[9px] text-primary font-bold flex items-center gap-0.5">
                        <Store className="h-2.5 w-2.5" /> {item.brand}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                      {item.product_link && (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(item.product_link!, '_blank'); }}
                          className="text-[9px] text-primary font-bold active:opacity-70"
                        >
                          View →
                        </button>
                      )}
                    </div>
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
          ))}
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
