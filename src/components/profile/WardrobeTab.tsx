import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, Sparkles, Store, ExternalLink, Trash2, MoreHorizontal, Heart, Bookmark } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { detectBrandFromUrl, detectCategoryFromUrl } from '@/lib/retailerDetect';
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
  is_liked?: boolean;
  is_saved?: boolean;
  source_post_id?: string | null;
}

type WardrobeFilter = 'all' | 'liked' | 'saved';

interface WardrobeTabProps {
  wardrobeItems: WardrobeItem[];
  onDeleteItem: (id: string) => void;
  favoriteRetailers: string[];
}

const WardrobeTab = ({ wardrobeItems, onDeleteItem, favoriteRetailers }: WardrobeTabProps) => {
  const [filter, setFilter] = useState<WardrobeFilter>('all');
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

  const likedCount = wardrobeItems.filter(i => i.is_liked).length;
  const savedCount = wardrobeItems.filter(i => i.is_saved).length;
  const filteredItems = filter === 'all' ? wardrobeItems
    : filter === 'liked' ? wardrobeItems.filter(i => i.is_liked)
    : wardrobeItems.filter(i => i.is_saved);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-3">
        {([
          { key: 'all' as const, label: 'All', count: wardrobeItems.length, icon: null },
          { key: 'liked' as const, label: 'Liked', count: likedCount, icon: <Heart className="h-3 w-3" /> },
          { key: 'saved' as const, label: 'Saved', count: savedCount, icon: <Bookmark className="h-3 w-3" /> },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
              filter === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {tab.icon}
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Outfit Builder entry point */}
      {wardrobeItems.length >= 2 && filter === 'all' && (
        <button
          onClick={() => navigate('/outfits')}
          className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 mb-3 active:scale-[0.98] transition-transform"
        >
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm">👗</span>
          </div>
          <div className="text-left">
            <p className="text-[12px] font-bold text-foreground">Outfit Builder</p>
            <p className="text-[10px] text-muted-foreground">Mix & match your wardrobe pieces</p>
          </div>
        </button>
      )}
      
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            {filter === 'liked' ? <Heart className="h-6 w-6 text-primary/60" /> : filter === 'saved' ? <Bookmark className="h-6 w-6 text-primary/60" /> : <Shirt className="h-6 w-6 text-primary/60" />}
          </div>
          <h2 className="text-[18px] font-bold text-foreground mb-1">
            {filter === 'all' ? 'Your wardrobe is empty' : filter === 'liked' ? 'No liked items yet' : 'No saved items yet'}
          </h2>
          <p className="text-[14px] text-muted-foreground max-w-[260px] mb-5">
            {filter === 'all' ? 'Save clothing items to try-on and track your fits.' : 'Like or save items from try-ons and the community feed.'}
          </p>
          {filter === 'all' && (
            <Button className="rounded-full btn-luxury text-primary-foreground text-sm h-11 px-6 font-bold" onClick={() => navigate('/home')}>
              Browse Items
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredItems.map(item => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
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
                  <div className="relative aspect-[3/4] px-1.5 pt-1.5">
                    <img src={item.image_url} alt={item.notes || item.category} className="w-full h-full object-cover object-top rounded-xl" />
                    {(() => {
                      const displayBrand = item.brand || (item.product_link ? detectBrandFromUrl(item.product_link).brand : null) || item.retailer;
                      return displayBrand ? (
                        <div className="absolute bottom-1.5 right-1.5">
                          <span className="brand-label">{displayBrand}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="p-2 space-y-0.5">
                    <p className="text-[11px] font-bold text-foreground capitalize truncate">
                      {item.notes || (item.category === 'top' && item.product_link ? detectCategoryFromUrl(item.product_link) || item.category : item.category)}
                    </p>
                    {(() => {
                      const detected = item.product_link ? detectBrandFromUrl(item.product_link) : null;
                      const displayRetailer = detected?.retailer || item.retailer;
                      return displayRetailer ? (
                        <p className="text-[11px] text-primary font-bold flex items-center gap-0.5">
                          <Store className="h-2.5 w-2.5" /> {displayRetailer}
                        </p>
                      ) : null;
                    })()}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                      {item.product_link && (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(item.product_link!, '_blank'); }}
                          className="text-[11px] text-primary font-bold active:opacity-70"
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
                        className="flex-1 py-1.5 rounded-lg bg-background border border-border text-[11px] font-bold text-foreground active:scale-95 transition-transform"
                      >
                        Try-On
                      </button>
                      <button
                        onClick={() => { setLongPressId(null); }}
                        className="flex-1 py-1.5 rounded-lg bg-background border border-border text-[11px] font-bold text-foreground active:scale-95 transition-transform"
                      >
                        Wishlist
                      </button>
                      <button
                        onClick={() => { setLongPressId(null); onDeleteItem(item.id); }}
                        className="flex-1 py-1.5 rounded-lg bg-background border border-destructive/30 text-[11px] font-bold text-destructive active:scale-95 transition-transform"
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
