import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, Trash2, ExternalLink, Sparkles, XCircle } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, loading, removeFromCart, clearCart } = useCart();

  const handleShop = (url: string) => {
    trackEvent('cart_shop_clickout', { url });
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4 text-primary" /> My Cart
            </h1>
            <p className="text-[10px] text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-[10px] text-muted-foreground h-7 px-2">
              Clear All
            </Button>
          )}
        </div>

        {!user ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="h-6 w-6 text-primary/50" />
            </div>
            <p className="text-[14px] font-bold text-foreground mb-1">Sign in to view your cart</p>
            <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">
              Create a free account to save looks to your cart.
            </p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="h-6 w-6 text-primary/50" />
            </div>
            <p className="text-[14px] font-bold text-foreground mb-1">Your cart is empty</p>
            <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">
              Tap the 🛒 button on any look in Style Check to add it here.
            </p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/style-check')}>
              Browse Looks
            </Button>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {items.map(item => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-2.5 flex gap-3">
                  {/* Thumbnail */}
                  <button
                    onClick={() => navigate('/style-check')}
                    className="shrink-0 w-16 h-20 rounded-lg overflow-hidden bg-muted/30"
                  >
                    <img
                      src={item.image_url}
                      alt={item.caption || 'Look'}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                  </button>

                  {/* Details */}
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
                          Shop <ExternalLink className="ml-1 h-2.5 w-2.5" />
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

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(item.post_id)}
                    className="shrink-0 self-start text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
                    aria-label="Remove from cart"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}


            <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
              We may earn a commission. It doesn't change your price.
            </p>
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Cart;
