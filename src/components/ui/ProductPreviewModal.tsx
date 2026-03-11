import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ProductPreviewData {
  image_url: string;
  name: string;
  brand: string;
  price_cents?: number | null;
  product_url?: string | null;
  category?: string;
}

interface ProductPreviewModalProps {
  product: ProductPreviewData | null;
  onClose: () => void;
  onTryOn?: (product: ProductPreviewData) => void;
  onShop?: (product: ProductPreviewData) => void;
}

/**
 * Unified fullscreen product preview modal.
 * Portaled to document.body, scroll-locked, maximized image.
 */
const ProductPreviewModal = ({ product, onClose, onTryOn, onShop }: ProductPreviewModalProps) => {
  useEffect(() => {
    if (!product) return;
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
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <img
          src={product.image_url}
          alt={product.name}
          className="max-w-full max-h-full object-contain rounded-xl"
          onClick={(e) => e.stopPropagation()}
          draggable={false}
        />
      </div>

      {/* Info + Actions — pinned to bottom */}
      <div
        className="shrink-0 px-5 pb-6 pt-3 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <p className="text-[11px] text-white/50 uppercase tracking-wider font-bold">{product.brand}</p>
          <p className="text-sm font-bold text-white mt-0.5 line-clamp-2">{product.name}</p>
          {product.price_cents != null && (
            <p className="text-sm font-bold text-primary mt-1">
              ${(product.price_cents / 100).toFixed(0)}
            </p>
          )}
        </div>

        <div className="flex gap-3 max-w-sm mx-auto w-full">
          {onTryOn && (
            <Button
              className="flex-1 gap-2 h-11 rounded-xl font-bold"
              onClick={() => onTryOn(product)}
            >
              <Sparkles className="h-4 w-4" />
              Try On
            </Button>
          )}
          {onShop && product.product_url && (
            <Button
              variant="outline"
              className="flex-1 gap-2 h-11 rounded-xl font-bold border-white/20 text-white hover:bg-white/10"
              onClick={() => onShop(product)}
            >
              <ExternalLink className="h-4 w-4" />
              Shop
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductPreviewModal;
