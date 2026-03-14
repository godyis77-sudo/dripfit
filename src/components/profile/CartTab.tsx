import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Sparkles, ExternalLink, XCircle, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import ProductPreviewModal, { type ProductPreviewData, type LookItemData } from '@/components/ui/ProductPreviewModal';
import WhatsInThisLook from '@/components/community/WhatsInThisLook';
import { useCart } from '@/hooks/useCart';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

const normalizeProductUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
  }
};

const CartTab = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, clearCart } = useCart();
  const [previewProduct, setPreviewProduct] = useState<ProductPreviewData | null>(null);
  const [previewLookItems, setPreviewLookItems] = useState<LookItemData[]>([]);
  const [previewCaption, setPreviewCaption] = useState<string | null>(null);
  const [catalogInfo, setCatalogInfo] = useState<Record<string, { brand: string; name: string }>>({});

  // Fetch catalog brand/name for primary product URLs
  useEffect(() => {
    const urls = items
      .map(i => i.product_urls?.[0])
      .filter((u): u is string => !!u);
    if (urls.length === 0) return;
    let cancelled = false;
    supabase
      .from('product_catalog')
      .select('product_url, brand, name')
      .in('product_url', urls)
      .eq('is_active', true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, { brand: string; name: string }> = {};
        data.forEach(r => {
          if (r.product_url) map[r.product_url] = { brand: r.brand, name: r.name };
        });
        setCatalogInfo(map);
      });
    return () => { cancelled = true; };
  }, [items]);

  const handleTryOn = async (productUrl?: string, fallbackClothingImageUrl?: string) => {
    trackEvent('cart_tryon_click', { productUrl });

    let clothingImageUrl = fallbackClothingImageUrl;

    if (productUrl) {
      try {
        const normalizedUrl = normalizeProductUrl(productUrl);
        const { data } = await supabase
          .from('product_catalog')
          .select('image_url, product_url')
          .ilike('product_url', `${normalizedUrl}%`)
          .eq('is_active', true)
          .limit(1);

        if (data?.[0]?.image_url) clothingImageUrl = data[0].image_url;
      } catch {
        // fallback keeps existing clothing image URL
      }
    }

    navigate('/tryon', {
      state: {
        productUrl,
        clothingImageUrl: clothingImageUrl || undefined,
      },
    });
  };

  const handleShop = (url: string) => {
    trackEvent('cart_shop_clickout', { url });
    window.open(url, '_blank', 'noopener');
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <ShoppingCart className="h-6 w-6 text-primary/50" />
        </div>
        <p className="text-[14px] font-bold text-foreground mb-1">Your cart is empty</p>
        <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">
          Save looks from Style Check by tapping the cart icon on any post.
        </p>
        <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/style-check')}>
          Browse Looks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] text-muted-foreground font-medium">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        <button onClick={clearCart} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
          <Trash2 className="h-3 w-3" /> Clear All
        </button>
      </div>

      {items.map(item => (
        <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-2.5 flex gap-3">
            {/* Fullscreen-enabled thumbnail */}
            <button
              type="button"
              onClick={async () => {
                const urls = item.product_urls ?? [];
                const primaryProductUrl = urls[0] ?? null;
                const primaryBrand = primaryProductUrl ? detectBrandFromUrl(primaryProductUrl).brand : null;
                setPreviewProduct({
                  image_url: item.image_url,
                  name: 'Look',
                  brand: primaryBrand || 'Shop',
                  product_url: primaryProductUrl,
                });
                setPreviewCaption(item.caption || null);
                // Build look items from all product URLs
                const derived: LookItemData[] = urls.map(url => {
                  const { brand } = detectBrandFromUrl(url);
                  let name = '';
                  try {
                    const u = new URL(url);
                    const segments = u.pathname.split('/').filter(Boolean);
                    const last = segments[segments.length - 1] || '';
                    name = last.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 40);
                    if (!name || name.length < 3) name = u.hostname.replace('www.', '');
                  } catch { name = 'Product'; }
                  return { brand: brand || 'Shop', name, url };
                });
                setPreviewLookItems(derived);

                // Enrich with catalog images
                if (urls.length > 0) {
                  const { data } = await supabase
                    .from('product_catalog')
                    .select('product_url, image_url, name, price_cents')
                    .in('product_url', urls);
                  if (data && data.length > 0) {
                    const catalogMap = new Map(data.map(r => [r.product_url, r]));
                    setPreviewLookItems(prev => prev.map(li => {
                      const match = catalogMap.get(li.url);
                      if (!match) return li;
                      return {
                        ...li,
                        image_url: match.image_url || li.image_url,
                        name: match.name || li.name,
                        price_cents: match.price_cents ?? li.price_cents,
                      };
                    }));
                  }
                }
              }}
              className="shrink-0 w-32 h-40 rounded-lg overflow-hidden bg-muted/30 cursor-pointer active:scale-95 transition-transform relative"
              aria-label={`Preview ${item.caption || 'Look'}`}
            >
              <img
                src={item.image_url}
                alt={item.caption || 'Look'}
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </button>

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                {item.product_urls?.[0] && (() => {
                  const detected = detectBrandFromUrl(item.product_urls[0]);
                  const retailer = detected.retailer;
                  const brand = detected.brand;
                  const info = catalogInfo[item.product_urls[0]];
                  // Show retailer badge (store name), fall back to brand if same-brand store
                  const displayRetailer = retailer && retailer !== brand ? retailer : (retailer || 'Shop');
                  return (
                    <>
                      <span className="brand-label-lg mb-1">{displayRetailer}</span>
                      <p className="text-[13px] font-bold text-foreground leading-tight">{info?.brand || brand}</p>
                      {info?.name && <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">{info.name}</p>}
                    </>
                  );
                })()}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Added {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>

              <div className="flex gap-1.5 mt-1.5">
                {item.product_urls && item.product_urls.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-9 flex-1 items-center justify-center rounded-lg btn-gold-3d px-4 text-[13px]"
                      >
                        Buy! <ChevronDown className="ml-1 h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[160px]">
                      {item.product_urls.map((url, idx) => {
                        const { brand } = detectBrandFromUrl(url);
                        return (
                          <DropdownMenuItem
                            key={idx}
                            onClick={() => handleShop(url)}
                            className="text-[11px] font-semibold gap-2"
                          >
                            <ExternalLink className="h-3 w-3 text-primary" />
                            {brand || `Item ${idx + 1}`}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : item.product_urls && item.product_urls.length === 1 ? (
                  <Button
                    size="sm"
                    className="h-9 rounded-lg btn-luxury text-primary-foreground text-[13px] font-bold flex-1"
                    onClick={() => handleShop(item.product_urls![0])}
                  >
                    Buy! <ExternalLink className="ml-1 h-2.5 w-2.5" />
                  </Button>
                ) : null}
              </div>
            </div>

            <button
              onClick={() => removeFromCart(item.post_id)}
              className="shrink-0 self-start text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
              aria-label="Remove from cart"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          {/* Shop This Style — lists all clothing & accessories */}
          {item.product_urls && item.product_urls.length > 0 && (
            <WhatsInThisLook
              productUrls={item.product_urls}
              clothingPhotoUrl={item.clothing_photo_url}
              variant="card"
              onTryOn={(lookItem) => handleTryOn(lookItem.url, lookItem.image_url || item.clothing_photo_url)}
            />
          )}
        </div>
      ))}

      <p className="text-[11px] text-muted-foreground/60 text-center mt-3">
        We may earn a commission. It doesn't change your price.
      </p>

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => { setPreviewProduct(null); setPreviewLookItems([]); setPreviewCaption(null); }}
        caption={previewCaption}
        onShop={previewProduct?.product_url ? (product) => {
          if (!product.product_url) return;
          handleShop(product.product_url);
          setPreviewProduct(null);
        } : undefined}
        lookItems={previewLookItems}
        onLookItemShop={(item) => {
          trackEvent('cart_shop_clickout', { url: item.url });
          window.open(item.url, '_blank', 'noopener');
        }}
        onLookItemTryOn={(item) => {
          handleTryOn(item.url, item.image_url ?? undefined);
          setPreviewProduct(null);
        }}
      />
    </div>
  );
};

export default CartTab;
