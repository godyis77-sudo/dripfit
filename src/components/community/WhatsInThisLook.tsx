import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { scrollIntoViewIfNeeded } from '@/lib/autoScroll';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, ShoppingBag, ShoppingCart, Bookmark } from 'lucide-react';
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
  items?: LookItem[];
  productUrls?: string[];
  clothingPhotoUrl?: string | null;
  defaultOpen?: boolean;
  variant?: 'card' | 'detail';
  onTryOn?: (item: LookItem) => void;
  onAddToWardrobe?: (item: LookItem) => void;
}

function deriveItemsFromUrls(urls: string[]): LookItem[] {
  return urls.map(url => {
    const { brand } = detectBrandFromUrl(url);
    let name = '';
    try {
      const u = new URL(url);
      const segments = u.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1] || '';
      name = last
        .replace(/[-_]/g, ' ')
        .replace(/\.[^.]+$/, '')
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
  const [catalogDescriptions, setCatalogDescriptions] = useState<Record<string, string>>({});
  const [previewProduct, setPreviewProduct] = useState<ProductPreviewData | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } = useAffiliateClickout({ extraProps: { source: 'whats_in_look' } });

  const handleToggle = useCallback(() => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setTimeout(() => {
        if (contentRef.current) {
          scrollIntoViewIfNeeded(contentRef.current);
        }
      }, 250);
    }
  }, [open]);

  let items: LookItem[] = propItems || [];
  if (items.length === 0) {
    const urls = productUrls?.length ? productUrls : [];
    items = deriveItemsFromUrls(urls);
  }

  const urlsNeedingImages = items.filter(i => !i.image_url).map(i => i.url).filter(Boolean);
  const allItemUrls = items.map(i => i.url).filter(Boolean);

  useEffect(() => {
    if (allItemUrls.length === 0) return;
    let cancelled = false;
    supabase
      .from('product_catalog')
      .select('product_url, image_url, description')
      .in('product_url', allItemUrls)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const imgMap: Record<string, string> = {};
        const descMap: Record<string, string> = {};
        data.forEach(row => {
          if (row.product_url && row.image_url) imgMap[row.product_url] = row.image_url;
          if (row.product_url && row.description) descMap[row.product_url] = row.description;
        });
        if (Object.keys(imgMap).length > 0) setCatalogImages(imgMap);
        if (Object.keys(descMap).length > 0) setCatalogDescriptions(descMap);
      });
    return () => { cancelled = true; };
  }, [allItemUrls.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) return null;

  const isCompact = variant === 'card';

  return (
    <div className={isCompact ? 'mx-1.5 mb-1.5' : 'mb-3'}>
      {/* Toggle — split into Shop pill + Closet icon */}
      {onAddToWardrobe ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggle}
            className="flex-1 flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform bg-primary/8 backdrop-blur-md border border-primary/20 h-7 px-3 text-primary"
            style={{ borderRadius: open ? '12px 12px 0 0' : '12px' }}
          >
            <ShoppingCart className="h-3 w-3 shrink-0" />
            <span className="text-[11px] font-bold tracking-wide uppercase">Shop</span>
            <ChevronDown className="h-2.5 w-2.5 transition-transform duration-200 text-primary/60" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (items.length > 0 && onAddToWardrobe) onAddToWardrobe(items[0]);
            }}
            className="shrink-0 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Add to closet"
          >
            <Bookmark className="h-3.5 w-3.5 text-white/60" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform bg-primary/8 backdrop-blur-md border border-primary/20 h-7 px-3 text-primary"
          style={{ borderRadius: open ? '12px 12px 0 0' : '12px' }}
        >
          <ShoppingCart className="h-3 w-3 shrink-0" />
          <span className="text-[11px] font-bold tracking-wide uppercase">Shop / Try-On</span>
          <ChevronDown className="h-2.5 w-2.5 transition-transform duration-200 text-primary/60" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>
      )}
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
              className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} space-y-2 bg-black/40 backdrop-blur-md border-x border-b border-white/8 rounded-b-xl`}
            >
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2.5">
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
                            description: catalogDescriptions[item.url] || null,
                          });
                        }}
                        className="shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-muted border border-white/10 cursor-pointer active:scale-95 transition-transform"
                        aria-label={`Preview ${item.name}`}
                      >
                        <img src={imgSrc} alt={item.name} className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div className="shrink-0 h-14 w-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-white/20" />
                      </div>
                    );
                  })()}

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] tracking-[0.15em] uppercase text-white/50 font-bold">{item.brand}</span>
                      {item.price_cents && (
                        <span className="text-[10px] font-display font-bold text-primary ml-auto">
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
                        className="text-[10px] font-bold bg-primary/8 backdrop-blur-sm border border-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-0.5 active:scale-95 transition-transform"
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
                          className="text-[10px] font-bold bg-primary/8 backdrop-blur-sm border border-primary/20 text-primary px-2 py-1 rounded-full active:scale-95 transition-transform"
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
                          className="text-[10px] font-bold bg-white/5 border border-white/10 text-white/60 px-2 py-1 rounded-full active:scale-95 transition-transform"
                        >
                          +Closet
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
          setPreviewProduct(null);
          setTimeout(() => beginClickout(product.brand, product.product_url!), 0);
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

      {pendingClickout && createPortal(
        <AnimatePresence>
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
              className="w-full max-w-sm bg-black/60 backdrop-blur-xl border border-white/10 rounded-t-2xl p-5 pb-8 space-y-3"
            >
              <p className="text-[13px] font-semibold text-white">
                You're leaving the app to visit {pendingClickout.retailer}.
              </p>
              <p className="text-[11px] text-white/40">Some links may earn us a commission.</p>
              <div className="flex gap-2 pt-1">
                <button onClick={confirmClickout} className="flex-1 h-10 rounded-xl btn-luxury text-primary-foreground text-[12px] font-bold">
                  Continue to Store
                </button>
                <button onClick={cancelClickout} className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-[12px] font-medium text-white/60">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default WhatsInThisLook;
