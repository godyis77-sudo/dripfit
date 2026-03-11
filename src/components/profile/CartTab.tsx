import { useState } from 'react';
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
          Tap 🛒 on any Style Check look to add it here.
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
              onClick={() => {
                const urls = item.product_urls ?? [];
                const primaryProductUrl = urls[0] ?? null;
                const primaryBrand = primaryProductUrl ? detectBrandFromUrl(primaryProductUrl).brand : null;
                setPreviewProduct({
                  image_url: item.image_url,
                  name: item.caption || 'Look',
                  brand: primaryBrand || 'Shop',
                  product_url: primaryProductUrl,
                });
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
              }}
              className="shrink-0 w-32 h-40 rounded-lg overflow-hidden bg-muted/30 cursor-pointer active:scale-95 transition-transform"
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
                {item.product_urls?.[0] && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold inline-block mb-1">
                    {detectBrandFromUrl(item.product_urls[0]).brand || 'Shop'}
                  </span>
                )}
                {item.caption && (
                  <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-snug">{item.caption}</p>
                )}
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Added {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>

              <div className="flex gap-1.5 mt-1.5">
                {item.product_urls && item.product_urls.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-7 flex-1 items-center justify-center rounded-lg btn-luxury px-3 text-[9px] font-bold text-primary-foreground"
                      >
                        Buy! <ChevronDown className="ml-1 h-2.5 w-2.5" />
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
                    className="h-7 rounded-lg btn-luxury text-primary-foreground text-[9px] font-bold flex-1"
                    onClick={() => handleShop(item.product_urls![0])}
                  >
                    Buy! <ExternalLink className="ml-1 h-2.5 w-2.5" />
                  </Button>
                ) : null}
                {item.product_urls && item.product_urls.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-lg border border-input bg-background px-3 text-[9px] font-bold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Sparkles className="mr-1 h-2.5 w-2.5" /> Try On <ChevronDown className="ml-1 h-2.5 w-2.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                      {item.product_urls.map((url, idx) => {
                        const { brand } = detectBrandFromUrl(url);
                        return (
                          <DropdownMenuItem
                            key={idx}
                            onClick={() => handleTryOn(url, item.clothing_photo_url)}
                            className="text-[11px] font-semibold gap-2"
                          >
                            <Sparkles className="h-3 w-3 text-primary" />
                            {brand || `Item ${idx + 1}`}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg text-[9px] font-bold"
                    onClick={() => handleTryOn(item.product_urls?.[0], item.clothing_photo_url)}
                  >
                    <Sparkles className="mr-1 h-2.5 w-2.5" /> Try On
                  </Button>
                )}
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

      <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
        We may earn a commission. It doesn't change your price.
      </p>

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => { setPreviewProduct(null); setPreviewLookItems([]); }}
        onShop={previewProduct?.product_url ? (product) => {
          if (!product.product_url) return;
          handleShop(product.product_url);
          setPreviewProduct(null);
        } : undefined}
        onTryOn={(product) => {
          handleTryOn(product.product_url ?? undefined, product.image_url);
          setPreviewProduct(null);
        }}
        lookItems={previewLookItems}
        onLookItemShop={(item) => {
          trackEvent('cart_look_shop_clickout', { url: item.url });
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
