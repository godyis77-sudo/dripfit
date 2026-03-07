import { useState, useEffect, useRef, useCallback } from 'react';
import { scrollIntoViewIfNeeded } from '@/lib/autoScroll';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ExternalLink, ShoppingBag, ShoppingCart } from 'lucide-react';
import { FullscreenImage } from '@/components/ui/fullscreen-image';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

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
  const contentRef = useRef<HTMLDivElement>(null);

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
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between active:scale-[0.98] transition-transform bg-primary text-primary-foreground"
        style={{
          borderRadius: open ? '12px 12px 0 0' : '12px',
          padding: isCompact ? '8px 12px' : '16px 20px',
        }}
      >
        <span className={`${isCompact ? 'text-[9px]' : 'text-[13px]'} font-bold uppercase tracking-widest flex items-center gap-2 text-primary-foreground`}>
          <ShoppingCart className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} />
          Try On - Buy!
        </span>
        <ChevronDown
          className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-primary-foreground transition-transform duration-200`}
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
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
              className={`${isCompact ? 'px-3 py-2' : 'px-4 py-3'} space-y-2`}
              style={{
                background: '#1A1A1A',
                borderLeft: '1px solid #252525',
                borderRight: '1px solid #252525',
                borderBottom: '1px solid #252525',
                borderRadius: '0 0 12px 12px',
              }}
            >
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* Product thumbnail — tap for fullscreen */}
                  {(() => {
                    const imgSrc = item.image_url || catalogImages[item.url] || (idx === 0 ? clothingPhotoUrl : null);
                    return imgSrc ? (
                      <FullscreenImage
                        src={imgSrc}
                        alt={item.name}
                        onShop={item.url ? () => { window.open(item.url, '_blank', 'noopener'); trackEvent('badge_clickout', { retailer: item.brand, source: 'fullscreen_look' }); } : undefined}
                        onTryOn={onTryOn ? () => onTryOn(item) : undefined}
                        onAddToWardrobe={onAddToWardrobe ? () => onAddToWardrobe(item) : undefined}
                      >
                        <div className={`shrink-0 ${isCompact ? 'h-8 w-8' : 'h-10 w-10'} rounded-lg overflow-hidden bg-[#252525] border border-[#333] flex items-center justify-center cursor-pointer active:scale-95 transition-transform`}>
                          <img src={imgSrc} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      </FullscreenImage>
                    ) : (
                      <div className={`shrink-0 ${isCompact ? 'h-8 w-8' : 'h-10 w-10'} rounded-lg overflow-hidden bg-[#252525] border border-[#333] flex items-center justify-center`}>
                        <ShoppingBag className={`${isCompact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground/40`} />
                      </div>
                    );
                  })()}

                  {/* Brand + Name */}
                  <div className="flex-1 min-w-0">
                    <span
                      className={`inline-block ${isCompact ? 'text-[8px]' : 'text-[10px]'} font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border mb-0.5`}
                      style={{
                        background: 'hsl(var(--primary) / 0.12)',
                        borderColor: 'hsl(var(--primary) / 0.3)',
                        color: 'hsl(var(--primary))',
                      }}
                    >
                      {item.brand}
                    </span>
                    <p className={`${isCompact ? 'text-[10px]' : 'text-[12px]'} text-foreground truncate leading-tight`}>
                      {item.name.length > 35 ? item.name.slice(0, 35) + '…' : item.name}
                    </p>
                  </div>

                    {/* Price + Shop + Try On */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.price_cents && (
                      <span className={`${isCompact ? 'text-[10px]' : 'text-[13px]'} font-bold text-primary`}>
                        ${(item.price_cents / 100).toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        window.open(item.url, '_blank', 'noopener');
                        trackEvent('badge_clickout', { retailer: item.brand, source: 'whats_in_look' });
                      }}
                      className={`${isCompact ? 'text-[9px]' : 'text-[11px]'} font-bold text-primary flex items-center gap-0.5 active:opacity-70`}
                    >
                      Shop <ExternalLink className={`${isCompact ? 'h-2 w-2' : 'h-2.5 w-2.5'}`} />
                    </button>
                    {onTryOn && (
                      <button
                        onClick={() => onTryOn(item)}
                        className={`${isCompact ? 'text-[9px]' : 'text-[11px]'} font-bold text-accent-foreground flex items-center gap-0.5 active:opacity-70 ml-1`}
                        style={{ color: 'hsl(var(--primary))' }}
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
  );
};

export default WhatsInThisLook;
