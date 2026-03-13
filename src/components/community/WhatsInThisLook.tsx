import { useState, useEffect, useRef, useCallback } from 'react';
import { scrollIntoViewIfNeeded } from '@/lib/autoScroll';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, ShoppingBag, ShoppingCart } from 'lucide-react';
import ProductPreviewModal, { type ProductPreviewData } from '@/components/ui/ProductPreviewModal';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';

export interface LookItem {
  brand: string;
  name: string;
  url: string;
  price_cents?: number | null;
  image_url?: string | null;
}

interface WhatsInThisLookProps {
  /** Pre-built items (from TryOn page) */
  items?: LookItem[];
  /** Raw product URLs (from Style Check posts) — items will be derived */
  productUrls?: string[];
  /** Clothing photo URL (used as fallback thumbnail) */
  clothingPhotoUrl?: string | null;
  /** Whether to start expanded */
  defaultOpen?: boolean;
  /** Variant: 'card' for feed cards (compact), 'detail' for detail sheets */
  variant?: 'card' | 'detail';
  /** Callback when user taps Try On from fullscreen */
  onTryOn?: (item: LookItem) => void;
  /** Callback when user taps Add to Wardrobe from fullscreen */
  onAddToWardrobe?: (item: LookItem) => void;
}

function deriveItemsFromUrls(urls: string[]): LookItem[] {
  return urls.map(url => {
    const { brand } = detectBrandFromUrl(url);
    let name = '';
    try {
      const u = new URL(url);
      // Try to extract product name from path
      const segments = u.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1] || '';
      name = last
        .replace(/[-_]/g, ' ')
        .replace(/\.[^.]+$/, '') // remove extension
        .replace(/\b\w/g, c => c.toUpperCase())
        .slice(0, 40);
      if (!name || name.length < 3) name = u.hostname.replace('www.', '');
    } catch {
      name = 'Product';
    }
    return { brand: brand || 'Shop', name, url };
  });
}

const WhatsInThisLook = ({
  items: propItems,
  productUrls,
  
  clothingPhotoUrl,
  defaultOpen = false,
  variant = 'detail',
  onTryOn,
  onAddToWardrobe,
}: WhatsInThisLookProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const [catalogImages, setCatalogImages] = useState<Record<string, string>>({});
  const [previewProduct, setPreviewProduct] = useState<ProductPreviewData | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } = useAffiliateClickout({ extraProps: { source: 'whats_in_look' } });

  // Auto-scroll to reveal expanded content
  const handleToggle = useCallback(() => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      // Wait for framer-motion animation (200ms) + buffer before measuring
      setTimeout(() => {
        if (contentRef.current) {
          scrollIntoViewIfNeeded(contentRef.current);
        }
      }, 250);
    }
  }, [open]);

  // Build items list
  let items: LookItem[] = propItems || [];
  if (items.length === 0) {
    const urls = productUrls?.length ? productUrls : [];
    items = deriveItemsFromUrls(urls);
  }

  // Enrich items missing image_url by looking up product_catalog
  const urlsNeedingImages = items.filter(i => !i.image_url).map(i => i.url).filter(Boolean);

  useEffect(() => {
    if (urlsNeedingImages.length === 0) return;
    let cancelled = false;
    supabase
      .from('product_catalog')
      .select('product_url, image_url')
      .in('product_url', urlsNeedingImages)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, string> = {};
        data.forEach(row => {
          if (row.product_url && row.image_url) map[row.product_url] = row.image_url;
        });
        if (Object.keys(map).length > 0) setCatalogImages(map);
      });
    return () => { cancelled = true; };
  }, [urlsNeedingImages.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) return null;

  const isCompact = variant === 'card';

  return (
    <div className={isCompact ? 'mx-1.5 mb-1.5' : 'mb-3'}>
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        className="w-full flex items-center justify-center gap-1 active:scale-[0.97] transition-transform btn-luxury text-primary-foreground shimmer-sweep h-10 rounded-xl px-2"
        style={{
          borderRadius: open ? '12px 12px 0 0' : '12px',
        }}
      >
        <ShoppingCart className="h-3 w-3 shrink-0" />
        <span className="text-[10px] font-bold uppercase whitespace-nowrap text-primary-foreground">
          {onAddToWardrobe ? 'Shop / +Wardrobe' : 'Shop / Try-On'}
        </span>
        <ShoppingBag className="h-3 w-3 shrink-0" />
        <ChevronDown
          className="h-3 w-3 shrink-0 text-primary-foreground transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
            ref={contentRef}
          >
            <div
              className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} space-y-2 bg-card border-x border-b border-border rounded-b-xl`}
            >
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2.5">
                  {/* Thumbnail */}
                  {(() => {
                    const imgSrc = item.image_url || catalogImages[item.url] || (idx === 0 ? clothingPhotoUrl : null);
                    return imgSrc ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewProduct({
                            image_url: imgSrc,
                            name: item.name,
                            brand: item.brand,
                            price_cents: item.price_cents,
                            product_url: item.url,
                          });
                        }}
                        className="shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-muted border border-border cursor-pointer active:scale-95 transition-transform"
                        aria-label={`Preview ${item.name}`}
                      >
                        <img src={imgSrc} alt={item.name} className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div className="shrink-0 h-14 w-14 rounded-lg bg-muted border border-border flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    );
                  })()}

                  {/* Right side: brand + price on top, actions on bottom */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded btn-luxury text-primary-foreground font-bold uppercase tracking-wider shimmer-sweep">{item.brand}</span>
                      {item.price_cents && (
                        <span className="text-[10px] font-bold text-primary ml-auto">
                          ${(item.price_cents / 100).toFixed(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          beginClickout(item.brand, item.url);
                        }}
                        className="text-[10px] font-bold text-foreground bg-primary/20 px-2 py-0.5 rounded-md flex items-center gap-0.5 active:opacity-70"
                      >
                        Shop <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                      {onTryOn && !onAddToWardrobe && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTryOn(item);
                          }}
                          className="text-[10px] font-bold text-foreground bg-primary/20 px-2 py-0.5 rounded-md active:opacity-70"
                        >
                          Try-On
                        </button>
                      )}
                      {onAddToWardrobe && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToWardrobe(item);
                          }}
                          className="text-[10px] font-bold text-foreground bg-primary/20 px-2 py-0.5 rounded-md active:opacity-70"
                        >
                          +Wardrobe
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onShop={(product) => {
          if (!product.product_url) return;
          beginClickout(product.brand, product.product_url);
          setPreviewProduct(null);
        }}
        onTryOn={onTryOn ? (product) => {
          if (!product.product_url) return;
          onTryOn({
            brand: product.brand,
            name: product.name,
            url: product.product_url,
            price_cents: product.price_cents,
            image_url: product.image_url,
          });
          setPreviewProduct(null);
        } : undefined}
      />

      {/* Affiliate disclosure confirmation */}
      <AnimatePresence>
        {pendingClickout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50"
            onClick={cancelClickout}
          >
            <motion.div
              initial={{ y: 80 }}
              animate={{ y: 0 }}
              exit={{ y: 80 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-card border border-border rounded-t-2xl p-5 pb-8 space-y-3"
            >
              <p className="text-[13px] font-semibold text-foreground">
                You're leaving the app to visit {pendingClickout.retailer}.
              </p>
              <p className="text-[11px] text-muted-foreground">Some links may earn us a commission.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={confirmClickout} className="flex-1 h-10 rounded-xl btn-luxury text-primary-foreground text-[12px] font-bold">
                  Continue to Store
                </button>
                <button onClick={cancelClickout} className="flex-1 h-10 rounded-xl border border-border text-[12px] font-medium text-muted-foreground">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsInThisLook;
