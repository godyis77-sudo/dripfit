import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, ImageIcon, ChevronRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { type CatalogProduct } from '@/hooks/useProductCatalog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressImage } from '@/components/tryon/tryon-constants';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';
import ProductPreviewModal, { type ProductPreviewData } from '@/components/ui/ProductPreviewModal';

const TRYON_NAV_USER_PHOTO_KEY = 'dripcheck_tryon_nav_user_photo';

const FULL_BODY_CATS = [
  'tops', 'top', 't-shirts', 'shirts', 'hoodies', 'polos', 'sweaters',
  'bottoms', 'bottom', 'jeans', 'pants', 'shorts',
  'dresses', 'dress', 'jumpsuits',
  'outerwear', 'jackets', 'coats', 'blazers', 'vests',
  'activewear', 'loungewear',
];

const OneTapPlayground = () => {
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ProductPreviewData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { data: allModelShots = [], isLoading: loading } = useQuery({
    queryKey: ['onetap-model-shots', mappedGender],
    queryFn: async () => {
      let query = supabase
        .from('product_catalog')
        .select('id, brand, name, image_url, product_url, price_cents, currency, category, presentation, image_confidence, tags, fit_profile, fabric_composition, style_genre, retailer, gender')
        .eq('is_active', true)
        .eq('presentation', 'model_shot')
        .in('category', FULL_BODY_CATS)
        .gte('image_confidence', 0.5)
        .not('image_url', 'is', null)
        .order('image_confidence', { ascending: false })
        .limit(48);

      if (mappedGender) {
        query = query.in('gender', [mappedGender, 'unisex']);
      }

      const { data } = await query;
      return (data ?? []) as unknown as CatalogProduct[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [shuffleSeed] = useState(() => Math.random());
  const curated = useMemo(() => {
    const seededSort = (a: CatalogProduct, b: CatalogProduct) => {
      const hashA = (a.id.charCodeAt(0) + a.id.charCodeAt(1) + shuffleSeed) % 1;
      const hashB = (b.id.charCodeAt(0) + b.id.charCodeAt(1) + shuffleSeed) % 1;
      return hashA - hashB;
    };
    const shuffled = [...allModelShots].sort(seededSort);
    const seen = new Set<string>();
    const result: CatalogProduct[] = [];
    for (const p of shuffled) {
      if (result.length >= 16) break;
      const key = `${p.brand}-${p.category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(p);
    }
    return result;
  }, [allModelShots, shuffleSeed]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUserPhoto(null);
    try {
      const compressed = await compressImage(file);
      setUserPhoto(compressed);
      trackEvent('onetap_photo_uploaded');
    } catch { /* ignore */ }
    setUploading(false);
  }, []);

  const handleNativeCapture = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      setUploading(true);
      setUserPhoto(null);
      const result = await takeNativePhoto(source);
      const blob = await fetch(result.dataUrl).then(r => r.blob());
      const compressed = await compressImage(new File([blob], 'capture.jpg', { type: blob.type }));
      setUserPhoto(compressed);
      trackEvent('onetap_photo_uploaded');
    } catch { /* cancelled */ }
    setUploading(false);
  }, []);

  const handleTapItem = useCallback((product: CatalogProduct) => {
    if (uploading) return;
    trackEvent('onetap_garment_tapped', { brand: product.brand, category: product.category });
    setPreviewProduct({
      id: product.id,
      brand: product.brand,
      name: product.name,
      image_url: product.image_url,
      product_url: product.product_url,
      price_cents: product.price_cents,
      category: product.category,
      fit_profile: product.fit_profile,
      fabric_composition: product.fabric_composition,
      style_genre: product.style_genre,
    });
  }, [uploading]);

  return (
    <>
    <section className="mb-4 rounded-2xl border border-white/5 glass-dark overflow-hidden">
      {/* Hidden inputs */}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={handleFileSelect} className="hidden" />

      {/* Split screen layout */}
      <div className="grid grid-cols-[1fr_1.5fr]">
        {/* Left: User photo / camera prompt */}
        <div className="relative border-r border-white/5 flex flex-col items-center justify-center p-3 glass-dark">
          <AnimatePresence mode="wait">
            {userPhoto ? (
              <motion.div
                key="photo"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/10"
              >
                <img src={userPhoto} alt="You" className="w-full h-full object-cover" />
                <button
                  onClick={() => setUserPhoto(null)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white/70"
                >
                  ✕
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[10px] font-bold text-white text-center">Now tap a fit →</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="h-14 w-14 rounded-2xl glass-gold flex items-center justify-center">
                  <Camera className="h-6 w-6 text-primary opacity-70" />
                </div>
                <p className="text-[12px] font-bold text-white">Your Photo</p>
                <p className="text-[10px] text-white/40 leading-tight">Add your photo first, then tap any item</p>
                <div className="flex gap-1.5 w-full max-w-[140px]">
                  <button
                    onClick={() => {
                      if (isNativePlatform()) handleNativeCapture('camera');
                      else cameraRef.current?.click();
                    }}
                    disabled={uploading}
                    className="flex-1 py-1.5 rounded-lg glass border border-white/10 active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Camera className="h-3 w-3 text-white/60" />
                    <span className="text-[10px] font-bold text-white/60">Snap</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isNativePlatform()) handleNativeCapture('gallery');
                      else fileRef.current?.click();
                    }}
                    disabled={uploading}
                    className="flex-1 py-1.5 rounded-lg glass border border-white/10 active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <ImageIcon className="h-3 w-3 text-white/60" />
                    <span className="text-[10px] font-bold text-white/60">Pick</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Garment carousel */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1 shrink-0">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary opacity-70" />
              <span className="text-[11px] font-display font-bold text-white">Tap a Fit</span>
            </div>
            <button
              onClick={() => navigate('/browse/all')}
              className="text-[10px] font-semibold text-primary flex items-center gap-0.5"
            >
              All <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div
            className="grid grid-cols-2 auto-rows-[120px] gap-2 px-2 pb-2 overflow-y-auto max-h-[520px]"
            onTouchStart={e => e.stopPropagation()}
          >
            {loading && !curated.length
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white/5 animate-pulse h-full" />
                ))
              : curated.map(product => (
                  <motion.button
                    key={product.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handleTapItem(product)}
                    className="relative rounded-2xl overflow-hidden border border-white/5 glass-dark active:border-primary/30 transition-colors h-full"
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                    <div className="absolute bottom-1.5 right-1.5">
                      <span className="bg-black/60 backdrop-blur-sm text-[9px] tracking-widest uppercase text-white/60 px-1.5 py-0.5 rounded-full">{product.brand}</span>
                    </div>
                  </motion.button>
                ))}
          </div>
        </div>
      </div>

      {/* Bottom prompt when no photo */}
      {!userPhoto && (
        <div className="px-3 py-2 border-t border-white/5">
          <p className="text-[10px] text-center text-white/40">
            <span className="font-bold text-primary">Skip the photo?</span> Tap any item to try it on with your camera later
          </p>
        </div>
      )}
    </section>

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onTryOn={(p) => {
          setPreviewProduct(null);
          try {
            if (userPhoto) sessionStorage.setItem(TRYON_NAV_USER_PHOTO_KEY, userPhoto);
            else sessionStorage.removeItem(TRYON_NAV_USER_PHOTO_KEY);
          } catch { /* ignore */ }
          navigate('/tryon', {
            state: {
              userPhoto: userPhoto || undefined,
              clothingUrl: p.image_url,
              productUrl: p.product_url,
              freshSession: true,
              quickPick: {
                id: p.id || '',
                brand: p.brand,
                name: p.name,
                image_url: p.image_url,
                product_url: p.product_url || null,
                price_cents: p.price_cents ?? null,
                category: p.category || 'other',
                retailer: p.brand,
                fit_profile: p.fit_profile || null,
                fabric_composition: p.fabric_composition || null,
                style_genre: p.style_genre || null,
              },
            },
          });
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

export default OneTapPlayground;
