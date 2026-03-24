import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, ImageIcon, ChevronRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { useAuth } from '@/hooks/useAuth';
import { compressImage } from '@/components/tryon/tryon-constants';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';
import { FullscreenImage } from '@/components/ui/fullscreen-image';

/**
 * One-Tap Playground: split-screen camera + trending garment carousel.
 * Users tap a garment → get sent to try-on with both photos pre-loaded.
 * Zero reading required — pure visual interaction.
 */
const CURATED_CATEGORIES = ['outerwear', 'tops', 'dress'] as const;

const OneTapPlayground = () => {
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const { products, loading } = useProductCatalog(undefined, undefined, undefined, mappedGender);

  const curated = useMemo(() => {
    const filtered = products.filter(p => p.image_url);
    // Pick a mix of categories, limit to 8
    const seen = new Set<string>();
    const result: CatalogProduct[] = [];
    for (const p of filtered) {
      if (result.length >= 8) break;
      const key = `${p.brand}-${p.category}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(p);
    }
    return result;
  }, [products]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
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
      const result = await takeNativePhoto(source);
      const blob = await fetch(result.dataUrl).then(r => r.blob());
      const compressed = await compressImage(new File([blob], 'capture.jpg', { type: blob.type }));
      setUserPhoto(compressed);
      trackEvent('onetap_photo_uploaded');
    } catch { /* cancelled */ }
    setUploading(false);
  }, []);

  const handleTapItem = useCallback((product: CatalogProduct) => {
    trackEvent('onetap_garment_tapped', { brand: product.brand, category: product.category });
    navigate('/tryon', {
      state: {
        userPhoto: userPhoto || undefined,
        clothingUrl: product.image_url,
        productUrl: product.product_url,
      },
    });
  }, [navigate, userPhoto]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="mb-4 rounded-2xl border border-primary/20 bg-card overflow-hidden"
    >
      {/* Hidden inputs */}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={handleFileSelect} className="hidden" />

      {/* Split screen layout */}
      <div className="grid grid-cols-[1fr_1.3fr] min-h-[220px]">
        {/* Left: User photo / camera prompt */}
        <div className="relative border-r border-border/50 flex flex-col items-center justify-center p-3 bg-gradient-to-b from-primary/5 to-transparent">
          <AnimatePresence mode="wait">
            {userPhoto ? (
              <motion.div
                key="photo"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-primary/40"
              >
                <img src={userPhoto} alt="You" className="w-full h-full object-cover" />
                <button
                  onClick={() => setUserPhoto(null)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-foreground"
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
                <div className="h-14 w-14 rounded-2xl badge-gold-3d flex items-center justify-center">
                  <Camera className="h-6 w-6 text-primary-foreground" />
                </div>
                <p className="text-[12px] font-bold text-foreground">Your Photo</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Add your photo first, then tap any item</p>
                <div className="flex gap-1.5 w-full max-w-[140px]">
                  <button
                    onClick={() => {
                      if (isNativePlatform()) handleNativeCapture('camera');
                      else cameraRef.current?.click();
                    }}
                    disabled={uploading}
                    className="flex-1 py-1.5 rounded-lg btn-gold-3d active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <Camera className="h-3 w-3 text-primary-foreground" />
                    <span className="text-[10px] font-bold text-primary-foreground">Snap</span>
                  </button>
                  <button
                    onClick={() => {
                      if (isNativePlatform()) handleNativeCapture('gallery');
                      else fileRef.current?.click();
                    }}
                    disabled={uploading}
                    className="flex-1 py-1.5 rounded-lg btn-gold-3d active:scale-95 transition-transform flex items-center justify-center gap-1"
                  >
                    <ImageIcon className="h-3 w-3 text-primary-foreground" />
                    <span className="text-[10px] font-bold text-primary-foreground">Pick</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Garment carousel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[12px] font-bold text-foreground">Tap a Style</span>
            </div>
            <button
              onClick={() => navigate('/browse/all')}
              className="text-[10px] font-semibold text-primary flex items-center gap-0.5"
            >
              All <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div
            className="flex-1 grid grid-cols-2 gap-1.5 px-2 pb-2 overflow-y-auto max-h-[260px]"
            onTouchStart={e => e.stopPropagation()}
          >
            {loading && !curated.length
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-lg skeleton-gold aspect-[3/4]" />
                ))
              : curated.map(product => (
                  <div key={product.id} className="relative rounded-lg overflow-hidden border border-border bg-background">
                    <FullscreenImage
                      src={product.image_url}
                      alt={product.name}
                      onTryOn={() => handleTapItem(product)}
                      onShop={product.product_url ? () => window.open(product.product_url!, '_blank') : undefined}
                    >
                      <div className="aspect-[3/4] relative overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-contain bg-muted/30"
                        />
                      </div>
                    </FullscreenImage>
                    <div className="px-1.5 py-1.5 bg-card">
                      <p className="text-[10px] font-bold text-foreground uppercase tracking-wide truncate">{product.brand}</p>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight">{product.name}</p>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* Bottom prompt when no photo */}
      {!userPhoto && (
        <div className="px-3 py-2 border-t border-border/50 bg-primary/5">
          <p className="text-[10px] text-center text-muted-foreground">
            <span className="font-bold text-primary">Skip the photo?</span> Tap any item to try it on with your camera later
          </p>
        </div>
      )}
    </motion.section>
  );
};

export default OneTapPlayground;
