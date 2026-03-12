import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ExternalLink, ShoppingCart, ChevronDown, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

export interface ProductPreviewData {
  image_url: string;
  name: string;
  brand: string;
  price_cents?: number | null;
  product_url?: string | null;
  category?: string;
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
  /** User-authored caption shown below the image */
  caption?: string | null;
  /** Optional list of all items in the look — renders an expandable "TRY-ON - SHOP" section */
  lookItems?: LookItemData[];
  onLookItemTryOn?: (item: LookItemData) => void;
  onLookItemShop?: (item: LookItemData) => void;
}

/**
 * Unified fullscreen product preview modal.
 * Portaled to document.body, scroll-locked, maximized image.
 */
const ProductPreviewModal = ({ product, onClose, onTryOn, onShop, caption, lookItems, onLookItemTryOn, onLookItemShop }: ProductPreviewModalProps) => {
  const [lookOpen, setLookOpen] = useState(false);

  useEffect(() => {
    if (!product) return;
    setLookOpen(false);
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [product]);

  if (!product) return null;

  const hasLookItems = lookItems && lookItems.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-dvh w-screen overflow-hidden overscroll-none bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] h-10 w-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Close"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Image — maximized */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-full w-fit max-w-full">
          {/* Brand badge */}
          {product.brand && (
            <span className="absolute bottom-3 right-3 z-10 brand-label-lg">
              {product.brand}
            </span>
          )}
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-auto max-w-full object-contain rounded-xl block"
            draggable={false}
          />
          {caption && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-xl px-4 py-3">
              <p className="text-[13px] text-white font-medium leading-snug text-center">"{caption}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Info + Actions — pinned to bottom */}
      <div
        className="shrink-0 px-5 pb-6 pt-3 space-y-3 max-h-[45dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <p className="text-[11px] text-white/50 uppercase tracking-wider font-bold shimmer-sweep">{product.brand}</p>
          {product.price_cents != null && (
            <p className="text-sm font-bold text-primary mt-1 shimmer-sweep">
              ${(product.price_cents / 100).toFixed(0)}
            </p>
          )}
        </div>

        <div className="flex gap-3 max-w-sm mx-auto w-full">
          {onTryOn && (
            <Button
              className="flex-1 gap-2 h-12 rounded-xl font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20"
              onClick={() => onTryOn(product)}
            >
              <Sparkles className="h-4 w-4" />
              Try On
            </Button>
          )}
          {onShop && product.product_url && (
            <Button
              className="flex-1 gap-2 h-12 rounded-xl font-bold btn-luxury text-primary-foreground shimmer-sweep"
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
              className="w-full flex items-center justify-center gap-2 btn-luxury text-primary-foreground shimmer-sweep active:scale-[0.98] transition-transform"
              style={{ borderRadius: lookOpen ? '12px 12px 0 0' : '12px', padding: '12px 16px' }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-[13px] font-bold uppercase tracking-widest">
                Shop This Style - Try On
              </span>
              <ChevronDown
                className="h-4 w-4 transition-transform duration-200"
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
                  <div className="px-3 py-2 space-y-2 bg-card border-x border-b border-border rounded-b-xl">
                    {lookItems!.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {/* Thumbnail */}
                        {item.image_url ? (
                          <div className="shrink-0 h-9 w-9 rounded-lg overflow-hidden bg-muted border border-border">
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="shrink-0 h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center">
                            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground block">{item.brand}</span>
                          <p className="text-[10px] text-foreground truncate leading-tight">{item.name}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.price_cents != null && (
                            <span className="text-[10px] font-bold text-primary">
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
                              Try On
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
