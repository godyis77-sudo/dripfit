import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Check, MessageSquare, Save, RotateCcw, ShoppingBag, Camera, ImageIcon, Bookmark, ChevronRight, ChevronDown } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { FullscreenImage } from '@/components/ui/fullscreen-image';
import WhatsInThisLook, { type LookItem as WhatsLookItem } from '@/components/community/WhatsInThisLook';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ACCESSORY_CATEGORIES, ALL_PRODUCT_CATEGORIES, getCaptionSuggestions, saveSharePreference, compressImage, imageUrlToBase64 } from './tryon-constants';
import type { CatalogProduct } from '@/hooks/useProductCatalog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LookItem {
  brand: string;
  name: string;
  url: string;
  price_cents?: number | null;
  image_url?: string | null;
}

interface TryOnResultSectionProps {
  resultImage: string;
  clothingPhoto: string | null;
  category: string;
  productLink: string;
  selectedQuickPick: CatalogProduct | null;
  lookItems: LookItem[];
  showLookItems: boolean;
  user: any;
  isPublic: boolean;
  caption: string;
  shared: boolean;
  showPostUI: boolean;
  showSuccessOverlay: boolean;
  savedToItems: boolean;
  layerHistory: string[];
  userGender: string | null;
  hasUnlimitedTryOns: boolean;
  addingAccessory: boolean;
  onSetCaption: (v: string) => void;
  onSetIsPublic: (v: boolean) => void;
  onSetShowPostUI: (v: boolean) => void;
  onShare: () => void;
  onTryAnother: () => void;
  onSaveToItems: () => void;
  onAddAccessory: (photo: string, category: string | null) => void;
  onSetLookItems: (fn: (prev: LookItem[]) => LookItem[]) => void;
  onToast: (opts: any) => void;
}

// Gold checkmark SVG
const AnimatedCheckmark = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.3" />
    <motion.path d="M20 32L28 40L44 24" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
  </svg>
);

const TryOnResultSection = ({
  resultImage, clothingPhoto, category, productLink, selectedQuickPick,
  lookItems, showLookItems, user, isPublic, caption, shared, showPostUI,
  showSuccessOverlay, savedToItems, layerHistory, userGender,
  hasUnlimitedTryOns, addingAccessory,
  onSetCaption, onSetIsPublic, onSetShowPostUI, onShare, onTryAnother,
  onSaveToItems, onAddAccessory, onSetLookItems, onToast,
}: TryOnResultSectionProps) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [showAccessorySection, setShowAccessorySection] = useState(false);
  const [accessoryPhoto, setAccessoryPhoto] = useState<string | null>(null);
  const [accessoryCategory, setAccessoryCategory] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showShopPicker, setShowShopPicker] = useState(false);
  const accessoryPhotoRef = useRef<HTMLInputElement>(null);
  const accessoryCameraRef = useRef<HTMLInputElement>(null);
  const [accessoryStepIndex, setAccessoryStepIndex] = useState(0);

  const handleAddToWardrobe = async (item: WhatsLookItem) => {
    if (!authUser) {
      onToast({ title: 'Sign in to save', description: 'Create a free account to build your wardrobe.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    try {
      const imageUrl = item.image_url || clothingPhoto || '';
      if (!imageUrl) { onToast({ title: 'No image available', variant: 'destructive' }); return; }
      
      // Upload base64 if needed
      let finalUrl = imageUrl;
      if (imageUrl.startsWith('data:')) {
        const blob = await fetch(imageUrl).then(r => r.blob());
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const path = `${authUser.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('wardrobe').upload(path, blob, { contentType: blob.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('wardrobe').getPublicUrl(path);
        finalUrl = urlData.publicUrl;
      }

      await supabase.from('clothing_wardrobe').insert({
        user_id: authUser.id,
        image_url: finalUrl,
        category: category || 'clothing',
        product_link: item.url || null,
        brand: item.brand || null,
        retailer: item.brand || null,
      });
      trackEvent('wardrobe_add_from_look', { brand: item.brand, source: 'tryon_look' });
      onToast({ title: 'Added to Wardrobe!', description: `${item.name} saved.` });
    } catch (err: unknown) {
      onToast({ title: 'Save failed', description: (err as Error).message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!addingAccessory) { setAccessoryStepIndex(0); return; }
    const timers = [
      setTimeout(() => setAccessoryStepIndex(1), 3000),
      setTimeout(() => setAccessoryStepIndex(2), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [addingAccessory]);

  const handleFileSelect = (setter: (v: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const compressed = await compressImage(file);
      setter(compressed);
      trackEvent('tryon_clothing_uploaded');
    } catch {
      onToast({ title: 'Image load failed', description: 'Try a different photo.', variant: 'destructive' });
    }
  };

  // Build look items for display
  const displayItems = lookItems.length > 0
    ? lookItems
    : (selectedQuickPick || productLink)
      ? [{
          brand: selectedQuickPick?.brand || (() => { try { return new URL(productLink).hostname.replace('www.', ''); } catch { return 'Product'; } })(),
          name: selectedQuickPick?.name || (() => { try { return new URL(productLink).hostname.replace('www.', ''); } catch { return 'Product'; } })(),
          url: productLink || selectedQuickPick?.product_url || '',
          price_cents: selectedQuickPick?.price_cents,
          image_url: selectedQuickPick?.image_url || null,
        }]
      : [];

  return (
    <>
      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center">
            <AnimatedCheckmark />
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-[28px] font-bold text-foreground mt-4">Looking good.</motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-[14px] text-muted-foreground mt-1">Saved to your profile</motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: showSuccessOverlay ? 1.5 : 0 }}>
        {/* Result image */}
        <FullscreenImage src={resultImage} alt="Try-on result">
          <motion.div className="rounded-xl overflow-hidden border border-primary/30 mb-3"
            initial={{ boxShadow: '0 0 0 0 hsla(var(--primary), 0)' }}
            animate={{ boxShadow: ['0 0 0 0 hsla(var(--primary), 0)', '0 0 20px 4px hsla(var(--primary), 0.3)', '0 0 0 0 hsla(var(--primary), 0)'] }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <img src={resultImage} alt="Try-on result" className="w-full" />
          </motion.div>
        </FullscreenImage>

        {/* What's In This Look */}
        <WhatsInThisLook items={displayItems} clothingPhotoUrl={clothingPhoto} defaultOpen={showLookItems} variant="detail" onAddToWardrobe={handleAddToWardrobe} />

        {/* PRIMARY CTA: Save & Post */}
        {!shared && !showPostUI && (
          <Button className="w-full h-11 rounded-xl btn-luxury text-primary-foreground text-sm font-bold mb-2" onClick={() => { onSetShowPostUI(true); if (!caption) onSetCaption(getCaptionSuggestions(category)[0]); onSetIsPublic(true); }}>
            <MessageSquare className="mr-1.5 h-4 w-4" /> Save & Post to Style Check
          </Button>
        )}

        {/* Post UI */}
        <AnimatePresence>
          {showPostUI && !shared && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-2">
              <div className="space-y-2 p-3 bg-card border border-border rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Caption or question</p>
                  <Textarea placeholder="e.g., Should I buy this for work?" value={caption} onChange={e => onSetCaption(e.target.value)} className="rounded-lg resize-none text-sm" rows={2} />
                  {!caption && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {getCaptionSuggestions(category).map(p => (
                        <button key={p} onClick={() => onSetCaption(p)} className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">{p}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between bg-muted/20 rounded-lg p-2.5 border border-border">
                  <div>
                    <span className="text-[12px] font-semibold text-foreground">Post to Style Check</span>
                    <p className="text-[11px] text-muted-foreground">{isPublic ? 'Visible to the community' : 'Private — only you can see'}</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={(v) => { onSetIsPublic(v); saveSharePreference(v); }} />
                </div>
                <Button className="w-full h-10 rounded-lg btn-luxury text-primary-foreground text-sm font-bold" onClick={onShare}>
                  {isPublic ? <><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Save & Post</> : <><Save className="mr-1.5 h-3.5 w-3.5" /> Save to Profile</>}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {shared && (
          <div className="flex items-center gap-2 justify-center mb-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
            <Check className="h-3.5 w-3.5 text-primary" />
            <span className="text-[12px] font-bold text-primary">{isPublic ? 'Posted to Style Check!' : 'Saved!'}</span>
          </div>
        )}


        {/* Try Another | Shop */}
        <div className="flex gap-2 mb-3">
          <Button variant="outline" className="flex-1 h-9 rounded-xl text-[11px]" onClick={onTryAnother}>
            <RotateCcw className="mr-1 h-3 w-3" /> Try Another
          </Button>
          <Button variant="outline" className="flex-1 h-9 rounded-xl text-[11px]" onClick={() => {
            const totalItems = displayItems.length;
            trackEvent('shop_clickout', { source: 'tryon', hasLink: !!productLink, itemCount: totalItems });
            if (totalItems > 1) {
              setShowShopPicker(true);
            } else if (totalItems === 1 && displayItems[0].url) {
              window.open(displayItems[0].url, '_blank', 'noopener');
            } else {
              window.open('https://www.google.com/search?tbm=shop&q=outfit', '_blank', 'noopener');
            }
          }}>
            <ShoppingBag className="mr-1 h-3 w-3" />
            {displayItems.length > 0 ? `Shop All Items (${displayItems.length})` : 'Find Similar Items'}
          </Button>
        </div>

        {/* Shop item picker */}
        <AnimatePresence>
          {showShopPicker && displayItems.length > 1 && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
              <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Choose item to shop</p>
                {displayItems.map((item, i) => (
                  <button key={i} onClick={() => { if (item.url) window.open(item.url, '_blank', 'noopener'); setShowShopPicker(false); }} className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary/40 active:scale-[0.98] transition-all text-left">
                    {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded-md object-cover border border-border shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.brand}</p>
                      <p className="text-[11px] font-bold text-foreground truncate">{item.name}</p>
                      {item.price_cents && <p className="text-[11px] font-bold text-primary">${(item.price_cents / 100).toFixed(0)}</p>}
                    </div>
                    <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
                <button onClick={() => setShowShopPicker(false)} className="w-full text-[10px] text-muted-foreground text-center py-1.5">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mb-3">
          <button onClick={() => setShowAccessorySection(!showAccessorySection)} className="w-full flex items-center justify-between btn-luxury text-primary-foreground rounded-xl px-4 py-3 active:scale-[0.97] transition-transform shimmer-sweep">
            <span className="text-[13px] font-bold uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Add More to this Style
              {layerHistory.length > 0 && <span className="text-[11px] bg-background/20 px-2 py-0.5 rounded-full ml-1">{layerHistory.length} layered</span>}
            </span>
            {showAccessorySection ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <AnimatePresence>
            {showAccessorySection && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="bg-card border border-t-0 border-border rounded-b-xl p-3">
                  <input ref={accessoryPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(setAccessoryPhoto)} className="hidden" />
                  <input ref={accessoryCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileSelect(setAccessoryPhoto)} className="hidden" />
                  <p className="text-[12px] text-foreground/70 mb-2">Layer one item at a time — tops, bottoms, shoes, and more</p>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    <button onClick={() => { setShowAllCategories(prev => !prev); setAccessoryCategory(null); }} className={`px-3 py-2 rounded-lg text-[12px] font-semibold border transition-all active:scale-95 ${showAllCategories ? 'border-primary bg-primary text-primary-foreground font-bold' : 'border-border text-foreground hover:border-primary/30'}`}>
                      🛍️ All Products
                    </button>
                    {ACCESSORY_CATEGORIES.map(c => (
                      <button key={c.key} onClick={() => { setAccessoryCategory(prev => prev === c.key ? null : c.key); setShowAllCategories(false); }} className={`px-3 py-2 rounded-lg text-[12px] font-semibold border transition-all active:scale-95 ${accessoryCategory === c.key && !showAllCategories ? 'border-primary bg-primary text-primary-foreground font-bold' : 'border-border text-foreground hover:border-primary/30'}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {accessoryPhoto ? (
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/40 shrink-0">
                        <img src={accessoryPhoto} alt="Accessory" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[10px] text-primary font-medium flex items-center gap-1"><Check className="h-3 w-3" /> {accessoryCategory || 'Accessory'} ready</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setAccessoryPhoto(null); setAccessoryCategory(null); }} className="text-[11px] text-primary underline font-medium">Browse</button>
                          <button onClick={() => accessoryPhotoRef.current?.click()} className="text-[11px] text-muted-foreground underline">Gallery</button>
                          <button onClick={() => { setAccessoryPhoto(null); setAccessoryCategory(null); }} className="text-[11px] text-destructive underline">Remove</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1.5 mb-2">
                        <button onClick={() => { if (!accessoryCategory) setAccessoryCategory('shoes'); accessoryCameraRef.current?.click(); }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary active:scale-95 transition-transform">
                          <Camera className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">Camera</span>
                        </button>
                        <button onClick={() => { if (!accessoryCategory) setAccessoryCategory('shoes'); accessoryPhotoRef.current?.click(); }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-card border border-border text-muted-foreground active:scale-95 transition-transform">
                          <ImageIcon className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">Gallery</span>
                        </button>
                      </div>
                      {showAllCategories && (
                        <div className="space-y-2 mb-2">
                          {ALL_PRODUCT_CATEGORIES.map(cat => (
                            <CategoryProductGrid key={cat.key} category={cat.key} title={cat.label} collapsed={true} maxItems={1000} showViewAll={true} gender={userGender || undefined}
                              onSelectProduct={async (product) => {
                                if (product.product_url) onSetLookItems(prev => [...prev, { brand: product.brand, name: product.name, url: product.product_url!, price_cents: product.price_cents, image_url: product.image_url }]);
                                trackEvent('catalog_product_clicked', { brand: product.brand, category: cat.key });
                                try { setAccessoryPhoto(await imageUrlToBase64(product.image_url)); } catch { setAccessoryPhoto(product.image_url); }
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {accessoryCategory && !showAllCategories && (
                        <div className="mb-2">
                          <CategoryProductGrid category={accessoryCategory} title={`Shop ${accessoryCategory}`} collapsed={false} maxItems={1000} gender={userGender || undefined}
                            onSelectProduct={async (product) => {
                              if (product.product_url) onSetLookItems(prev => [...prev, { brand: product.brand, name: product.name, url: product.product_url!, price_cents: product.price_cents, image_url: product.image_url }]);
                              trackEvent('catalog_product_clicked', { brand: product.brand, category: accessoryCategory });
                              try { setAccessoryPhoto(await imageUrlToBase64(product.image_url)); } catch { setAccessoryPhoto(product.image_url); }
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {!addingAccessory && (
                    <Button className="w-full h-10 rounded-lg text-[12px] font-bold btn-luxury text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-30" onClick={() => { onAddAccessory(accessoryPhoto!, accessoryCategory); setAccessoryPhoto(null); setAccessoryCategory(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={!accessoryPhoto}>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {layerHistory.length > 0 ? 'Add Another Accessory to Look' : `Add ${accessoryCategory || 'Accessory'} to Look`}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating generating bar — portal to escape transforms */}
        {addingAccessory && createPortal(
          <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-[120] px-4 animate-in slide-in-from-bottom-8 duration-300">
            <div className="mx-auto w-full max-w-[390px] bg-gradient-to-t from-background via-background to-background/80 pt-2">
              <div className="bg-card border border-primary/30 rounded-xl p-4">
                <Button className="w-full h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground opacity-100 animate-pulse" disabled>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Try-On…
                </Button>
                <div className="flex flex-col items-center mt-2 gap-1.5">
                  <p className="text-xs text-muted-foreground font-medium">
                    {accessoryStepIndex === 0 && 'Analysing the accessory…'}
                    {accessoryStepIndex === 1 && 'Compositing onto your look…'}
                    {accessoryStepIndex === 2 && 'Finalising your preview…'}
                  </p>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${i <= accessoryStepIndex ? 'bg-primary' : 'border border-muted-foreground/40'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        <p className="text-[10px] text-muted-foreground/50 text-center mt-1">We may earn a commission. It doesn't change your price.</p>
      </motion.div>
    </>
  );
};

export default TryOnResultSection;
