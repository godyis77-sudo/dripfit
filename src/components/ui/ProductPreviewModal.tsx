import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { X, Sparkles, ExternalLink, ShoppingCart, ChevronDown, ShoppingBag } from 'lucide-react';
import { PriceWatchButton } from '@/components/pricing/PriceWatchUI';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { decodeHtmlEntities } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export interface ProductPreviewData {
  id?: string;
  image_url: string;
  name: string;
  brand: string;
  price_cents?: number | null;
  product_url?: string | null;
  category?: string;
  currency?: string;
  fit_profile?: string[] | null;
  fabric_composition?: string[] | null;
  style_genre?: string | null;
  additional_images?: string[] | null;
  description?: string | null;
}

export interface LookItemData {
  brand: string;
  name: string;
  url: string;
  price_cents?: number | null;
  image_url?: string | null;
}

interface ProductPreviewModalProps {
  product: ProductPreviewData | null;
  onClose: () => void;
  onTryOn?: (product: ProductPreviewData) => void;
  onShop?: (product: ProductPreviewData) => void;
  caption?: string | null;
  lookItems?: LookItemData[];
  onLookItemTryOn?: (item: LookItemData) => void;
  onLookItemShop?: (item: LookItemData) => void;
}

/** Zoomable product image with pinch + double-tap + multi-image carousel */
function ZoomableProductImage({ src, alt, brand, caption, additionalImages }: { src: string; alt: string; brand?: string; caption?: string | null; additionalImages?: string[] | null }) {
  const allImages = [src, ...(additionalImages?.filter(Boolean) ?? [])];
  const hasMultiple = allImages.length > 1;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [navHint, setNavHint] = useState<'left' | 'right' | null>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);
  const swipeStart = useRef<{ x: number; time: number } | null>(null);
  const navHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setCurrentIdx(0); setZoom(1); setPan({ x: 0, y: 0 }); }, [src]);
  useEffect(() => () => { if (navHintTimer.current) clearTimeout(navHintTimer.current); }, []);

  const showNavHint = useCallback((dir: 'left' | 'right') => {
    setNavHint(dir);
    if (navHintTimer.current) clearTimeout(navHintTimer.current);
    navHintTimer.current = setTimeout(() => setNavHint(null), 400);
  }, []);

  const swipeCommitted = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      if (zoom > 1) {
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setIsPanning(true);
      } else if (hasMultiple) {
        swipeStart.current = { x: e.touches[0].clientX, time: Date.now() };
        swipeCommitted.current = false;
      }
    }
  }, [zoom, hasMultiple]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / lastDist.current;
      setZoom(prev => Math.min(4, Math.max(1, prev * scale)));
      lastDist.current = dist;
    } else if (e.touches.length === 1 && isPanning && lastTouch.current && zoom > 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 1 && swipeStart.current && !swipeCommitted.current && zoom <= 1 && hasMultiple) {
      const dx = e.touches[0].clientX - swipeStart.current.x;
      if (Math.abs(dx) > 30) {
        swipeCommitted.current = true;
        if (dx < 0 && currentIdx < allImages.length - 1) {
          setCurrentIdx(i => i + 1);
          showNavHint('right');
        } else if (dx > 0 && currentIdx > 0) {
          setCurrentIdx(i => i - 1);
          showNavHint('left');
        }
      }
    }
  }, [isPanning, zoom, hasMultiple, currentIdx, allImages.length, showNavHint]);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = null;
    lastTouch.current = null;
    setIsPanning(false);
    swipeStart.current = null;
    swipeCommitted.current = false;
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); } else { setZoom(2.5); }
  }, [zoom]);

  const handleTapZone = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom !== 1 || !hasMultiple) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const third = rect.width / 3;
    if (clickX < third && currentIdx > 0) {
      e.stopPropagation();
      setCurrentIdx(i => i - 1);
      showNavHint('left');
    } else if (clickX > third * 2 && currentIdx < allImages.length - 1) {
      e.stopPropagation();
      setCurrentIdx(i => i + 1);
      showNavHint('right');
    }
  }, [zoom, hasMultiple, currentIdx, allImages.length, showNavHint]);

  const activeSrc = allImages[currentIdx] || src;

  return (
    <div
      className="flex-1 flex items-center justify-center p-2 min-h-0 max-h-[60dvh] overflow-hidden touch-none"
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e); }}
      onTouchMove={(e) => { e.stopPropagation(); handleTouchMove(e); }}
      onTouchEnd={(e) => { e.stopPropagation(); handleTouchEnd(); }}
      onDoubleClick={handleDoubleClick}
    >
      <div className="relative h-full w-full rounded-2xl overflow-hidden bg-muted" onClick={handleTapZone}>
        {brand && (
          <span className="absolute top-3 left-3 z-20 text-[10px] tracking-[0.2em] uppercase text-white/40 font-bold">{brand}</span>
        )}
        {hasMultiple && zoom <= 1 && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {allImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrentIdx(i); }}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  i === currentIdx
                    ? 'bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5)] scale-125'
                    : 'bg-white/50 shadow-[0_0_0_1.5px_rgba(0,0,0,0.3)]'
                }`}
              />
            ))}
          </div>
        )}
        {navHint === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 animate-pulse">
            <ChevronLeft className="h-8 w-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
          </div>
        )}
        {navHint === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 animate-pulse">
            <ChevronRight className="h-8 w-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
          </div>
        )}
        {zoom > 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-black/70 border border-white/25 backdrop-blur-sm text-[11px] font-bold text-white active:scale-95 transition-transform"
          >
            Reset Zoom
          </button>
        )}
        <img
          src={activeSrc}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover rounded-2xl block"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
          draggable={false}
        />
        {caption && zoom <= 1 && (
          <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-2xl px-4 py-3">
            <p className="text-[13px] text-white font-medium leading-snug text-center">"{caption}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

const ProductPreviewModal = ({ product, onClose, onTryOn, onShop, caption, lookItems, onLookItemTryOn, onLookItemShop }: ProductPreviewModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addToCart, removeFromCart, isInCart } = useCart();
  const [lookOpen, setLookOpen] = useState(false);
  const [addingToWardrobe, setAddingToWardrobe] = useState(false);
  const [addedToWardrobe, setAddedToWardrobe] = useState(false);

  useEffect(() => {
    if (!product) return;
    setLookOpen(false);
    setAddingToWardrobe(false);
    setAddedToWardrobe(false);
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [product]);

  const handleAddToWardrobe = async () => {
    if (!user || !product) return;
    setAddingToWardrobe(true);
    const { error } = await supabase.from('clothing_wardrobe').insert({
      user_id: user.id,
      image_url: product.image_url,
      category: product.category || 'top',
      product_link: product.product_url || null,
      brand: product.brand || null,
    });
    setAddingToWardrobe(false);
    if (error) {
      if (error.code === '23505') {
        setAddedToWardrobe(true);
        toast({ title: 'Already saved', description: 'This item is already in your closet.' });
      } else {
        toast({ title: 'Error', description: 'Could not add to closet.', variant: 'destructive' });
      }
      return;
    }
    setAddedToWardrobe(true);
    trackEvent('wardrobe_added_from_tryon', { brand: product.brand });
    toast({ title: '👕 Added to Closet!', description: 'You can find it in your Closet tab.' });
  };

  if (!product) return null;

  const fitItems = product.fit_profile?.filter(Boolean) ?? [];
  const fabricItems = product.fabric_composition?.filter(Boolean) ?? [];
  const hasFit = fitItems.length > 0;
  const hasFabric = fabricItems.length > 0;
  const hasLookItems = lookItems && lookItems.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-dvh w-screen overflow-hidden overscroll-none bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Close — glass circular */}
      <button
        onClick={onClose}
        className="absolute right-4 z-[120] h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
        style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
        aria-label="Close"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Image */}
      <ZoomableProductImage src={product.image_url} alt={decodeHtmlEntities(product.name)} brand={product.brand} caption={caption} additionalImages={product.additional_images} />

      {/* Info + Actions */}
      <div
        className="shrink-0 px-5 pb-6 pt-3 space-y-3 max-h-[38dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-bold">{product.brand}</p>
          <p className="text-[13px] text-white/80 font-semibold mt-0.5 line-clamp-2 px-2">{decodeHtmlEntities(product.name)}</p>
          {product.price_cents != null && (
            <p className="font-display text-xl text-primary mt-1">
              ${(product.price_cents / 100).toFixed(0)}
            </p>
          )}
          {product.description && (
            <p className="text-[12px] text-white/55 leading-relaxed text-left whitespace-pre-line px-2 mt-2">
              {product.description}
            </p>
          )}
          {(hasFit || hasFabric || product.style_genre) && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-2">
              {product.style_genre && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                  {product.style_genre}
                </span>
              )}
              {hasFit && fitItems.map((fit) => (
                <span key={fit} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-semibold capitalize">
                  {fit}
                </span>
              ))}
              {hasFabric && fabricItems.map((fab) => (
                <span key={fab} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-[10px] font-semibold capitalize">
                  {fab}
                </span>
              ))}
            </div>
           )}
        </div>

        {/* +Closet + +Cart — glass treatment */}
        {user && (
          <div className="max-w-sm mx-auto w-full flex gap-2">
            <Button
              variant="outline"
              className={`flex-1 h-11 rounded-full text-[12px] font-bold gap-1.5 backdrop-blur-sm ${addedToWardrobe ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/[0.06] border-white/[0.1] text-white hover:bg-white/10'}`}
              onClick={handleAddToWardrobe}
              disabled={addingToWardrobe || addedToWardrobe}
            >
              <ShoppingBag className="h-4 w-4" />
              {addingToWardrobe ? 'Adding…' : addedToWardrobe ? 'Saved ✓' : '+ Closet'}
            </Button>
            {product.id && (
              <Button
                variant="outline"
                className={`flex-1 h-11 rounded-full text-[12px] font-bold gap-1.5 backdrop-blur-sm ${isInCart(product.id) ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/[0.06] border-white/[0.1] text-white hover:bg-white/10'}`}
                onClick={() => {
                  if (!product.id) return;
                  if (isInCart(product.id)) {
                    removeFromCart(product.id);
                  } else {
                    addToCart({
                      post_id: product.id,
                      image_url: product.image_url,
                      caption: product.name,
                      product_urls: product.product_url ? [product.product_url] : null,
                      clothing_photo_url: product.image_url,
                      brand: product.brand,
                    });
                  }
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                {product.id && isInCart(product.id) ? 'In Cart ✓' : '+ Cart'}
              </Button>
            )}
          </div>
        )}

        {/* Watch Price — glass pill */}
        {user && product.id && product.price_cents != null && (
          <div className="flex justify-center">
            <PriceWatchButton
              productId={product.id}
              productName={product.name}
              brand={product.brand}
              productUrl={product.product_url || undefined}
              priceCents={product.price_cents}
              currency={product.currency}
            />
          </div>
        )}

        <div className="flex gap-3 max-w-sm mx-auto w-full">
          {onTryOn && (
            <Button
              className="flex-1 gap-2 h-12 rounded-full font-semibold text-sm bg-[#C9A84C] text-zinc-950 hover:opacity-90 shadow-none"
              onClick={() => onTryOn(product)}
            >
              <Sparkles className="h-4 w-4" />
              Try-On
            </Button>
          )}
          {onShop && product.product_url && (
            <Button
              className="flex-1 gap-2 h-12 rounded-full font-semibold text-sm bg-[#C9A84C] text-zinc-950 hover:opacity-90 shadow-none"
              onClick={() => onShop(product)}
            >
              <ShoppingCart className="h-4 w-4" />
              Buy!
            </Button>
          )}
        </div>

        {/* Look items dropdown */}
        {hasLookItems && (
          <div className="max-w-sm mx-auto w-full">
            <button
              type="button"
              onClick={() => setLookOpen(!lookOpen)}
              className="w-full flex items-center justify-center gap-2 bg-primary/8 backdrop-blur-md border border-primary/20 text-primary active:scale-[0.98] transition-transform"
              style={{ borderRadius: lookOpen ? '12px 12px 0 0' : '12px', padding: '12px 16px' }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-wide">
                Shop Style / Try-On
              </span>
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200 text-primary/60"
                style={{ transform: lookOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            <AnimatePresence>
              {lookOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-3 py-2 space-y-2 bg-black/40 backdrop-blur-md border-x border-b border-white/8 rounded-b-xl">
                    {lookItems!.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {item.image_url ? (
                          <div className="shrink-0 h-9 w-9 rounded-lg overflow-hidden bg-muted border border-white/10">
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="shrink-0 h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <ShoppingBag className="h-3.5 w-3.5 text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] tracking-[0.15em] uppercase text-white/40 font-bold block">{item.brand}</span>
                          <p className="text-[10px] text-white/70 truncate leading-tight">{decodeHtmlEntities(item.name)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.price_cents != null && (
                            <span className="text-[10px] font-display font-bold text-primary">
                              ${(item.price_cents / 100).toFixed(0)}
                            </span>
                          )}
                          {onLookItemShop && (
                            <button
                              type="button"
                              onClick={() => onLookItemShop(item)}
                              className="text-[11px] font-bold text-primary flex items-center gap-0.5 active:opacity-70"
                            >
                              Shop <ExternalLink className="h-2 w-2" />
                            </button>
                          )}
                          {onLookItemTryOn && (
                            <button
                              type="button"
                              onClick={() => onLookItemTryOn(item)}
                              className="text-[11px] font-bold text-primary flex items-center gap-0.5 active:opacity-70 ml-1"
                            >
                              Try-On
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ProductPreviewModal;
