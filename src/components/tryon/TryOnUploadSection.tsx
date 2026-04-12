import { forwardRef, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Check, User, Shirt, Camera, ImageIcon, Link2, Store, Bookmark, FolderOpen, CheckCircle2, XCircle, Lightbulb, Image } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { compressImage } from './tryon-constants';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  product_link: string | null;
}

interface TryOnUploadSectionProps {
  userPhoto: string | null;
  clothingPhoto: string | null;
  productLink: string;
  clothingSaved: boolean;
  wardrobeItems: WardrobeItem[];
  showWardrobe: boolean;
  user: any;
  onUserPhotoChange: (v: string) => void;
  onClothingPhotoChange: (v: string) => void;
  onProductLinkChange: (v: string) => void;
  onSaveClothingToWardrobe: () => void;
  onSelectFromWardrobe: (item: WardrobeItem) => void;
  onToggleWardrobe: () => void;
  onToast: (opts: any) => void;
  onRemoveClothing?: () => void;
  onBrowseProducts?: () => void;
  backgroundSource: 'user' | 'clothing';
  onBackgroundSourceChange: (v: 'user' | 'clothing') => void;
}

const TryOnUploadSection = forwardRef<HTMLDivElement, TryOnUploadSectionProps>(({ 
  userPhoto, clothingPhoto, productLink, clothingSaved,
  wardrobeItems, showWardrobe, user,
  onUserPhotoChange, onClothingPhotoChange, onProductLinkChange,
  onSaveClothingToWardrobe, onSelectFromWardrobe, onToggleWardrobe, onToast,
  onRemoveClothing, onBrowseProducts,
  backgroundSource, onBackgroundSourceChange,
}, ref) => {
  const userPhotoRef = useRef<HTMLInputElement>(null);
  const userCameraRef = useRef<HTMLInputElement>(null);
  const clothingPhotoRef = useRef<HTMLInputElement>(null);
  const clothingCameraRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (setter: (v: string) => void, type: 'photo' | 'clothing') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const compressed = await compressImage(file);
      setter(compressed);
      trackEvent(type === 'photo' ? 'tryon_photo_uploaded' : 'tryon_clothing_uploaded');
    } catch {
      onToast({ title: 'Image load failed', description: 'Try a different photo.', variant: 'destructive' });
    }
  };

  const handleNativeCapture = async (setter: (v: string) => void, type: 'photo' | 'clothing', source: 'camera' | 'gallery') => {
    try {
      const result = await takeNativePhoto(source);
      const compressed = await compressImage(
        await fetch(result.dataUrl).then(r => r.blob()).then(b => new File([b], 'capture.jpg', { type: b.type })),
        1280, 0.8,
      );
      setter(compressed);
      trackEvent(type === 'photo' ? 'tryon_photo_uploaded' : 'tryon_clothing_uploaded');
    } catch (err: any) {
      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) return;
      onToast({ title: 'Camera error', description: 'Try again or use gallery.', variant: 'destructive' });
    }
  };

  return (
    <div ref={ref}>
      <div className="grid grid-cols-2 gap-2 mb-3 items-start">
        <input ref={userPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(onUserPhotoChange, 'photo')} className="hidden" />
        <input ref={userCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={handleFileSelect(onUserPhotoChange, 'photo')} className="hidden" />
        <input ref={clothingPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(onClothingPhotoChange, 'clothing')} className="hidden" />
        <input ref={clothingCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileSelect(onClothingPhotoChange, 'clothing')} className="hidden" />

        {/* Your Photo */}
        <div>
          <p className="text-[12px] font-bold text-foreground uppercase tracking-wider mb-1">Your Photo</p>
          {userPhoto ? (
            <div className="relative">
              <button onClick={() => userPhotoRef.current?.click()} className="w-full rounded-xl overflow-hidden border-2 border-primary/40 bg-card active:scale-[0.97] transition-all">
                <div className="aspect-[3/4]"><img src={userPhoto} alt="You" className="w-full h-full object-cover" /></div>
              </button>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-[12px] text-primary font-semibold flex items-center gap-0.5"><Check className="h-3 w-3" /> Ready</p>
                <button onClick={(e) => { e.stopPropagation(); userPhotoRef.current?.click(); }} className="text-[12px] text-foreground/80 hover:text-foreground transition-colors underline">Change</button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-white/10 glass-dark overflow-hidden">
              <div className="aspect-[3/4] flex flex-col items-center justify-center gap-1.5 p-2.5">
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-foreground/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-foreground/50" />
                </div>
                {/* Photo quality guidance */}
                <div className="w-full flex items-center justify-center gap-2 my-0.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="h-7 w-7 rounded-md bg-accent/40 border border-accent flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent-foreground" />
                    </div>
                    <span className="text-[8px] text-accent-foreground font-medium">Full body</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="h-7 w-7 rounded-md bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                    <span className="text-[8px] text-destructive font-medium">Cropped</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[8px] text-primary font-medium">Good light</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground text-center leading-tight">Front facing · plain background</p>
                <div className="flex gap-1.5 w-full">
                  <button onClick={() => {
                    if (isNativePlatform()) handleNativeCapture(onUserPhotoChange, 'photo', 'camera');
                    else userCameraRef.current?.click();
                  }} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg btn-gold-3d active:scale-95 transition-transform">
                    <Camera className="h-3.5 w-3.5 text-primary-foreground" /><span className="text-[12px] font-bold text-primary-foreground">Camera</span>
                  </button>
                  <button onClick={() => {
                    if (isNativePlatform()) handleNativeCapture(onUserPhotoChange, 'photo', 'gallery');
                    else userPhotoRef.current?.click();
                  }} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg btn-gold-3d active:scale-95 transition-transform">
                    <ImageIcon className="h-3.5 w-3.5 text-primary-foreground" /><span className="text-[12px] font-bold text-primary-foreground">Gallery</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clothing Item */}
        <div>
          <p className="text-[12px] font-bold text-foreground uppercase tracking-wider mb-1">Clothing</p>
          {clothingPhoto ? (
            <div className="relative">
              <button onClick={() => clothingPhotoRef.current?.click()} className="w-full rounded-xl overflow-hidden border-2 border-primary/40 bg-card active:scale-[0.97] transition-all">
                <div className="aspect-[3/4]"><img src={clothingPhoto} alt="Clothing" className="w-full h-full object-cover" /></div>
              </button>
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                <p className="text-[12px] text-primary font-semibold flex items-center gap-0.5"><Check className="h-3 w-3" /> Ready</p>
                {onBrowseProducts && (
                  <button onClick={(e) => { e.stopPropagation(); onBrowseProducts(); }} className="text-[12px] text-primary hover:text-primary/80 transition-colors underline font-medium">Browse</button>
                )}
                <button onClick={(e) => { e.stopPropagation(); clothingPhotoRef.current?.click(); }} className="text-[12px] text-foreground/80 hover:text-foreground transition-colors underline">Gallery</button>
                {onRemoveClothing && (
                  <button onClick={(e) => { e.stopPropagation(); onRemoveClothing(); }} className="text-[12px] text-destructive hover:text-destructive/80 transition-colors underline">Remove</button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border-2 border-dashed border-white/10 glass-dark overflow-hidden">
                <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 p-3">
                  <div className="h-12 w-12 rounded-full border-2 border-dashed border-foreground/30 flex items-center justify-center">
                    <Shirt className="h-6 w-6 text-foreground/50" />
                  </div>
                  <p className="text-[12px] text-foreground/70 text-center">Product photo · clean background</p>
                  <div className="flex gap-1.5 w-full">
                    <button onClick={() => {
                      if (isNativePlatform()) handleNativeCapture(onClothingPhotoChange, 'clothing', 'camera');
                      else clothingCameraRef.current?.click();
                    }} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg btn-gold-3d active:scale-95 transition-transform">
                      <Camera className="h-3.5 w-3.5 text-primary-foreground" /><span className="text-[12px] font-bold text-primary-foreground">Camera</span>
                    </button>
                    <button onClick={() => {
                      if (isNativePlatform()) handleNativeCapture(onClothingPhotoChange, 'clothing', 'gallery');
                      else clothingPhotoRef.current?.click();
                    }} className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg btn-gold-3d active:scale-95 transition-transform">
                      <ImageIcon className="h-3.5 w-3.5 text-primary-foreground" /><span className="text-[12px] font-bold text-primary-foreground">Gallery</span>
                    </button>
                  </div>
                </div>
              </div>
              {user && wardrobeItems.length > 0 && (
                <button onClick={onToggleWardrobe} className="w-full flex items-center justify-center gap-1 py-1 rounded-lg pill active:scale-95 transition-transform mt-1.5">
                  <FolderOpen className="h-3.5 w-3.5" /><span className="text-[12px] font-bold">My Closet ({wardrobeItems.length})</span>
                </button>
              )}
            </>
          )}
          {showWardrobe && wardrobeItems.length > 0 && (
            <div className="mt-2 glass-dark rounded-xl p-2 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-3 gap-1.5">
                {wardrobeItems.map(item => (
                  <button key={item.id} onClick={() => onSelectFromWardrobe(item)} className="rounded-lg overflow-hidden border border-border hover:border-primary/40 active:scale-95 transition-all">
                    <img src={item.image_url} alt="" className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Background source picker — show when both photos are set */}
      {userPhoto && clothingPhoto && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Image className="h-3.5 w-3.5 text-foreground/70" />
            <p className="text-[12px] text-foreground/70">Background from</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => onBackgroundSourceChange('user')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all active:scale-[0.97] ${
                backgroundSource === 'user'
                  ? 'btn-luxury text-primary-foreground'
                  : 'bg-card border border-border text-foreground/70'
              }`}
            >
              <User className="h-3.5 w-3.5" /> Your Photo
            </button>
            <button
              onClick={() => onBackgroundSourceChange('clothing')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold transition-all active:scale-[0.97] ${
                backgroundSource === 'clothing'
                  ? 'btn-luxury text-primary-foreground'
                  : 'bg-card border border-border text-foreground/70'
              }`}
            >
              <Shirt className="h-3.5 w-3.5" /> Clothing Photo
            </button>
          </div>
        </div>
      )}

      {/* Product link */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Link2 className="h-3.5 w-3.5 text-foreground/70" />
          <p className="text-[12px] text-foreground/70">Paste product link <span className="text-foreground/50">(optional)</span></p>
        </div>
        <Input
          placeholder="https://zara.com/product/..."
          value={productLink}
          onChange={e => {
            onProductLinkChange(e.target.value);
            if (e.target.value.length > 10) trackEvent('product_link_pasted');
          }}
          className="rounded-lg h-9 text-[13px]"
        />
        {productLink.length > 10 && (() => {
          const hostname = (() => { try { return new URL(productLink).hostname.toLowerCase(); } catch { return ''; } })();
          const matched = ['shein', 'zara', 'hm', 'gap', 'nordstrom', 'lululemon', 'macys', 'jcpenney', 'aritzia', 'simons'].find(r => hostname.includes(r));
          return matched ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold flex items-center gap-1">
                <Store className="h-3 w-3" /> Matched: {matched}
              </span>
              <span className="text-[12px] text-foreground/70">We'll recommend the best size.</span>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
});

TryOnUploadSection.displayName = 'TryOnUploadSection';

export default TryOnUploadSection;
