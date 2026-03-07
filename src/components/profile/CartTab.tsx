import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Sparkles, ExternalLink, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullscreenImage } from '@/components/ui/fullscreen-image';
import WhatsInThisLook from '@/components/community/WhatsInThisLook';
import { useCart } from '@/hooks/useCart';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { trackEvent } from '@/lib/analytics';

const CartTab = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, clearCart } = useCart();

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
            <FullscreenImage
              src={item.image_url}
              alt={item.caption || 'Look'}
              onShop={item.product_urls?.[0] ? () => handleShop(item.product_urls![0]) : undefined}
              onTryOn={() => navigate('/tryon', { state: { productUrl: item.product_urls?.[0] } })}
            >
              <div className="shrink-0 w-16 h-20 rounded-lg overflow-hidden bg-muted/30 cursor-pointer active:scale-95 transition-transform">
                <img
                  src={item.image_url}
                  alt={item.caption || 'Look'}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
            </FullscreenImage>

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
                {item.product_urls && item.product_urls.length > 0 && (
                  <Button
                    size="sm"
                    className="h-7 rounded-lg btn-luxury text-primary-foreground text-[9px] font-bold flex-1"
                    onClick={() => handleShop(item.product_urls![0])}
                  >
                    Buy! <ExternalLink className="ml-1 h-2.5 w-2.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-lg text-[9px] font-bold"
                  onClick={() => navigate('/tryon', { state: { productUrl: item.product_urls?.[0] } })}
                >
                  <Sparkles className="mr-1 h-2.5 w-2.5" /> Try On
                </Button>
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
              onTryOn={(lookItem) => navigate('/tryon', { state: { productUrl: lookItem.url } })}
            />
          )}
        </div>
      ))}

      <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
        We may earn a commission. It doesn't change your price.
      </p>
    </div>
  );
};

export default CartTab;
