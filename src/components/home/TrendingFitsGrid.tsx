import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ProductPreviewModal, { type ProductPreviewData } from '@/components/ui/ProductPreviewModal';


interface TrendingFit {
  id: string;
  brand: string;
  name: string;
  image_url: string;
  product_url: string | null;
  price_cents: number | null;
  category: string;
}

interface TrendingFitsGridProps {
  fits: TrendingFit[];
}

const TrendingFitsGrid = ({ fits }: TrendingFitsGridProps) => {
  const navigate = useNavigate();
  const [previewProduct, setPreviewProduct] = useState<ProductPreviewData | null>(null);

  if (!fits.length) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary shimmer-icon" />
            <p className="section-label mb-0">Tap a Fit</p>
          </div>
          <button
            onClick={() => navigate('/browse/all')}
            className="text-[10px] text-primary font-semibold min-h-[44px] flex items-center"
          >
            Browse all →
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {fits.slice(0, 6).map((fit) => (
            <button
              key={fit.id}
              onClick={() =>
                setPreviewProduct({
                  id: fit.id,
                  brand: fit.brand,
                  name: fit.name,
                  image_url: fit.image_url,
                  product_url: fit.product_url,
                  price_cents: fit.price_cents,
                  category: fit.category,
                })
              }
              className="relative glass-card rounded-xl overflow-hidden aspect-[3/4] group active:scale-[0.97] active:translate-y-[1px] transition-all shadow-3d active:shadow-3d-pressed"
            >
              <img
                src={fit.image_url}
                alt={fit.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-1.5">
                <p className="text-[9px] font-extrabold text-white uppercase tracking-wide truncate drop-shadow-sm">{fit.brand}</p>
                {fit.price_cents != null && (
                  <p className="text-[11px] font-extrabold text-white">${(fit.price_cents / 100).toFixed(0)}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onTryOn={(p) => {
          setPreviewProduct(null);
          navigate('/tryon', { state: { clothingUrl: p.image_url, productUrl: p.product_url } });
        }}
        onShop={(p) => {
          if (p.product_url) {
            window.open(p.product_url, '_blank', 'noopener');
          }
        }}
      />
    </>
  );
};

export default TrendingFitsGrid;
