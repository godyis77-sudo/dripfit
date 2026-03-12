import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Check, User, Shirt, Camera, ImageIcon, Link2, Store, Bookmark, FolderOpen } from 'lucide-react';
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
}

const TryOnUploadSection = ({
  userPhoto, clothingPhoto, productLink, clothingSaved,
  wardrobeItems, showWardrobe, user,
  onUserPhotoChange, onClothingPhotoChange, onProductLinkChange,
  onSaveClothingToWardrobe, onSelectFromWardrobe, onToggleWardrobe, onToast,
  onRemoveClothing, onBrowseProducts,
}: TryOnUploadSectionProps) => {
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
      // Compress native camera output to prevent memory bloat
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
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <input ref={userPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(onUserPhotoChange, 'photo')} className="hidden" />
        <input ref={userCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={handleFileSelect(onUserPhotoChange, 'photo')} className="hidden" />
        <input ref={clothingPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(onClothingPhotoChange, 'clothing')} className="hidden" />
        <input ref={clothingCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileSelect(onClothingPhotoChange, 'clothing')} className="hidden" />

        {/* Your Photo */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Your Photo <span className="text-destructive">*</span></p>
          {userPhoto ? (
            <div className="relative">
              <button onClick={() => userPhotoRef.current?.click()} className="w-full rounded-xl overflow-hidden border-2 border-primary/40 bg-card active:scale-[0.97] transition-all">
                <div className="aspect-[3/4]"><img src={userPhoto} alt="You" className="w-full h-full object-cover" /></div>
              </button>
              <div className="flex items-center justify-center gap-2 mt-1">
                <p className="text-[11px] text-primary font-medium flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> Ready</p>
                <button onClick={(e) => { e.stopPropagation(); userPhotoRef.current?.click(); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline">Change</button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border bg-card overflow-hidden">
              <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 p-3">
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">Full body · front facing · well lit</p>
                <div className="flex gap-1.5 w-full">
                  <button onClick={() => {
                    if (isNativePlatform()) handleNativeCapture(onUserPhotoChange, 'photo', 'camera');
                    else userCameraRef.current?.click();
                  }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary active:scale-95 transition-transform">
                    <Camera className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">Camera</span>
                  </button>
                  <button onClick={() => {
                    if (isNativePlatform()) handleNativeCapture(onUserPhotoChange, 'photo', 'gallery');
                    else userPhotoRef.current?.click();
                  }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-card border border-border text-muted-foreground active:scale-95 transition-transform">
                    <ImageIcon className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">Gallery</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clothing Item */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Clothing <span className="text-destructive">*</span></p>
          {clothingPhoto ? (
            <div className="relative">
              <button onClick={() => clothingPhotoRef.current?.click()} className="w-full rounded-xl overflow-hidden border-2 border-primary/40 bg-card active:scale-[0.97] transition-all">
                <div className="aspect-[3/4]"><img src={clothingPhoto} alt="Clothing" className="w-full h-full object-cover" /></div>
              </button>
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                <p className="text-[11px] text-primary font-medium flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> Ready</p>
                {onBrowseProducts && (
                  <button onClick={(e) => { e.stopPropagation(); onBrowseProducts(); }} className="text-[11px] text-primary hover:text-primary/80 transition-colors underline font-medium">Browse</button>
                )}
                <button onClick={(e) => { e.stopPropagation(); clothingPhotoRef.current?.click(); }} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline">Gallery</button>
                {onRemoveClothing && (
                  <button onClick={(e) => { e.stopPropagation(); onRemoveClothing(); }} className="text-[11px] text-destructive hover:text-destructive/80 transition-colors underline">Remove</button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border bg-card overflow-hidden">
              <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 p-3">
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Shirt className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">Product photo · clean background</p>
                <div className="flex gap-1.5 w-full">
                  <button onClick={() => {
                    if (isNativePlatform()) handleNativeCapture(onClothingPhotoChange, 'clothing', 'camera');
                    else clothingCameraRef.current?.click();
                  }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary active:scale-95 transition-transform">
                    <Camera className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">Camera</span>
                  </button>
                  <button onClick={() => {
                    if (isNativePlatform()) handleNativeCapture(onClothingPhotoChange, 'clothing', 'gallery');
                    else clothingPhotoRef.current?.click();
                  }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-card border border-border text-muted-foreground active:scale-95 transition-transform">
                    <ImageIcon className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">Gallery</span>
                  </button>
                </div>
                {user && wardrobeItems.length > 0 && (
                  <button onClick={onToggleWardrobe} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-primary/20 text-primary active:scale-95 transition-transform mt-0.5">
                    <FolderOpen className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">My Wardrobe ({wardrobeItems.length})</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {showWardrobe && wardrobeItems.length > 0 && (
            <div className="mt-2 bg-card border border-border rounded-xl p-2 max-h-[200px] overflow-y-auto">
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

      {/* Product link */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Link2 className="h-3 w-3 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Paste product link <span className="text-[9px] text-muted-foreground/70">(optional)</span></p>
        </div>
        <Input
          placeholder="https://zara.com/product/..."
          value={productLink}
          onChange={e => {
            onProductLinkChange(e.target.value);
            if (e.target.value.length > 10) trackEvent('product_link_pasted');
          }}
          className="rounded-lg h-9 text-[12px]"
        />
        {productLink.length > 10 && (() => {
          const hostname = (() => { try { return new URL(productLink).hostname.toLowerCase(); } catch { return ''; } })();
          const matched = ['shein', 'zara', 'hm', 'gap', 'nordstrom', 'lululemon', 'macys', 'jcpenney', 'aritzia', 'simons'].find(r => hostname.includes(r));
          return matched ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold flex items-center gap-1">
                <Store className="h-3 w-3" /> Matched: {matched}
              </span>
              <span className="text-[9px] text-muted-foreground">We'll recommend the best size.</span>
            </div>
          ) : null;
        })()}
      </div>
    </>
  );
};

export default TryOnUploadSection;
