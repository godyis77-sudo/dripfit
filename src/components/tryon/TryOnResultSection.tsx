import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Check, MessageSquare, Save, RotateCcw, ShoppingBag, Camera, ImageIcon, Bookmark, ChevronRight, ChevronDown, X, ArrowLeftRight, ExternalLink, Image } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import WhatsInThisLook, { type LookItem as WhatsLookItem } from '@/components/community/WhatsInThisLook';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ACCESSORY_CATEGORIES, ALL_PRODUCT_CATEGORIES, getCaptionSuggestions, saveSharePreference, compressImage, imageUrlToBase64 } from './tryon-constants';
import type { CatalogProduct } from '@/hooks/useProductCatalog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TryOnLoadingAnimation from '@/components/tryon/TryOnLoadingAnimation';
import BackgroundSwapOverlay from '@/components/bgswap/BackgroundSwapOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';

interface LookItem {
  brand: string;
  name: string;
  url: string;
  price_cents?: number | null;
  image_url?: string | null;
}

interface TryOnResultSectionProps {
  resultImage: string;
  userPhoto: string | null;
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
  resultImage, userPhoto, clothingPhoto, category, productLink, selectedQuickPick,
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
  const accessorySectionRef = useRef<HTMLDivElement>(null);
  const [accessoryStepIndex, setAccessoryStepIndex] = useState(0);
  const [showResultFullscreen, setShowResultFullscreen] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [showBgSwap, setShowBgSwap] = useState(false);

  const handleAddToWardrobe = async (item: WhatsLookItem) => {
    if (!authUser) {
      onToast({ title: 'Sign in to save', description: 'Create a free account to build your wardrobe.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    try {
      const imageUrl = item.image_url || clothingPhoto || '';
      if (!imageUrl) { onToast({ title: 'No image available', variant: 'destructive' }); return; }
      
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

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    if (showResultFullscreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [showResultFullscreen]);

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

  const shopUrl = displayItems[0]?.url || productLink || selectedQuickPick?.product_url;
  const productName = selectedQuickPick?.name || displayItems[0]?.name;
  const productBrand = selectedQuickPick?.brand || displayItems[0]?.brand;
  const productPrice = selectedQuickPick?.price_cents || displayItems[0]?.price_cents;

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

        {/* ── Hero Result Image ── */}
        <div className="relative rounded-2xl overflow-hidden border border-primary/20 mb-3 shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.15)]">
          <button
            type="button"
            onClick={() => setShowResultFullscreen(true)}
            className="block w-full cursor-zoom-in"
            aria-label="Open try-on result full screen"
          >
            <AnimatePresence mode="wait">
              {showBeforeAfter && userPhoto ? (
                <motion.div key="before-after" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-0">
                  <div className="relative">
                    <img src={userPhoto} alt="Your photo" className="w-full aspect-[3/4] object-cover rounded-l-xl" />
                    <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-black/60 text-white px-2 py-0.5 rounded-md">Before</span>
                  </div>
                  <div className="relative">
                    <img src={resultImage} alt="Try-on result" className="w-full aspect-[3/4] object-cover rounded-r-xl" />
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-md">Result</span>
                  </div>
                </motion.div>
              ) : (
                <motion.img key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} src={resultImage} alt="Try-on result" className="w-full rounded-2xl" />
              )}
            </AnimatePresence>
          </button>

          {/* Before/After toggle */}
          {userPhoto && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowBeforeAfter(v => !v); }}
              className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold active:scale-95 transition-transform"
            >
              <ArrowLeftRight className="h-3 w-3" />
              {showBeforeAfter ? 'Full View' : 'Compare'}
            </button>
          )}
        </div>

        {/* ── Product Info Bar ── */}
        {(productName || shopUrl) && (
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 mb-3">
            {selectedQuickPick?.image_url && (
              <img src={selectedQuickPick.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              {productBrand && <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{productBrand}</p>}
              {productName && <p className="text-[11px] font-bold text-foreground truncate">{productName}</p>}
              {productPrice && <p className="text-[12px] font-bold text-primary">${(productPrice / 100).toFixed(0)}</p>}
            </div>
            {shopUrl && (
              <button
                onClick={() => window.open(shopUrl, '_blank', 'noopener')}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg btn-luxury text-primary-foreground text-[10px] font-bold active:scale-95 transition-transform"
              >
                <ExternalLink className="h-3 w-3" /> Shop
              </button>
            )}
          </div>
        )}

        {/* ── Quick Action Bar ── */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {!shared && (
            <button
              onClick={() => { onSetShowPostUI(true); if (!caption) onSetCaption(getCaptionSuggestions(category)[0]); onSetIsPublic(true); }}
              className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-card border border-border active:scale-[0.96] transition-transform"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-foreground">Post</span>
            </button>
          )}
          {shared && (
            <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-primary">Posted</span>
            </div>
          )}
          <button
            onClick={() => setShowBgSwap(true)}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-card border border-primary/20 active:scale-[0.96] transition-transform"
          >
            <Image className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-primary">Background</span>
          </button>
          <button
            onClick={onTryAnother}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-card border border-border active:scale-[0.96] transition-transform"
          >
            <RotateCcw className="h-4 w-4 text-foreground/70" />
            <span className="text-[10px] font-bold text-foreground">New</span>
          </button>
          <button
            onClick={onSaveToItems}
            disabled={savedToItems}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-transform disabled:opacity-70 disabled:cursor-not-allowed ${savedToItems ? 'bg-primary/5 border-primary/20' : 'bg-card border-border active:scale-[0.96]'}`}
          >
            <Bookmark className={`h-4 w-4 ${savedToItems ? 'text-primary fill-primary' : 'text-foreground/70'}`} />
            <span className={`text-[10px] font-bold ${savedToItems ? 'text-primary' : 'text-foreground'}`}>{savedToItems ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {/* Post-try-on scan nudge */}
        {!user?.lastScanDate && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => { trackEvent('postscan_tryon_click'); navigate('/capture'); }}
            className="w-full flex items-center gap-3 p-3 mb-3 rounded-xl border border-primary/25 bg-primary/5 active:scale-[0.97] transition-transform"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[12px] font-bold text-foreground">Get Your Perfect Size</p>
              <p className="text-[10px] text-muted-foreground">Quick body scan → know your exact size for this brand</p>
            </div>
            <ChevronRight className="h-4 w-4 text-primary shrink-0" />
          </motion.button>
        )}

        {/* What's In This Look */}
        {displayItems.length > 0 && (
          <WhatsInThisLook items={displayItems} clothingPhotoUrl={clothingPhoto} defaultOpen={showLookItems} variant="detail" onAddToWardrobe={handleAddToWardrobe} />
        )}

        {/* Post UI */}
        <AnimatePresence>
          {showPostUI && !shared && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
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
                <Button className="w-full h-10 rounded-lg btn-luxury text-primary-foreground text-[13px] font-bold tracking-wide" onClick={onShare}>
                  {isPublic ? <><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Save & Post</> : <><Save className="mr-1.5 h-3.5 w-3.5" /> Save to Profile</>}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add More Style ── */}
        <div className="mb-3">
          <button onClick={() => { const opening = !showAccessorySection; setShowAccessorySection(opening); if (opening) { setTimeout(() => accessorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250); } }} className="w-full flex items-center justify-center gap-2 btn-luxury text-primary-foreground rounded-xl px-4 h-11 active:scale-[0.97] transition-transform shimmer-sweep">
            <Sparkles className="h-4 w-4" />
            <span className="text-[13px] font-bold uppercase tracking-wide">Add More Style</span>
            {layerHistory.length > 0 && <span className="text-[11px] bg-background/20 px-2 py-0.5 rounded-full">{layerHistory.length} layered</span>}
            {showAccessorySection ? <span className="h-5 w-5 badge-gold-3d rounded-md flex items-center justify-center"><ChevronDown className="h-2.5 w-2.5 text-primary-foreground" /></span> : <span className="h-5 w-5 badge-gold-3d rounded-md flex items-center justify-center"><ChevronRight className="h-2.5 w-2.5 text-primary-foreground" /></span>}
          </button>
          <AnimatePresence>
            {showAccessorySection && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div ref={accessorySectionRef} className="bg-card border border-t-0 border-border rounded-b-xl p-3">
                  <input ref={accessoryPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(setAccessoryPhoto)} className="hidden" />
                  <input ref={accessoryCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileSelect(setAccessoryPhoto)} className="hidden" />
                  <p className="text-[12px] text-foreground/70 mb-2">Layer one item at a time — tops, bottoms, shoes, and more</p>
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    <button onClick={() => { setShowAllCategories(prev => !prev); setAccessoryCategory(null); }} className={`pill ${showAllCategories ? 'pill-filled' : ''}`}>
                      🛍️ All Products
                    </button>
                    {ACCESSORY_CATEGORIES.map(c => (
                      <button key={c.key} onClick={() => { setAccessoryCategory(prev => prev === c.key ? null : c.key); setShowAllCategories(false); }} className={`pill ${accessoryCategory === c.key && !showAllCategories ? 'pill-filled' : ''}`}>
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
                        <button onClick={() => { if (!accessoryCategory) setAccessoryCategory('shoes'); accessoryCameraRef.current?.click(); }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg btn-gold-3d active:scale-95 transition-transform">
                          <Camera className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">Camera</span>
                        </button>
                        <button onClick={() => { if (!accessoryCategory) setAccessoryCategory('shoes'); accessoryPhotoRef.current?.click(); }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg pill active:scale-95 transition-transform">
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
                    <Button className="w-full h-10 rounded-lg text-[13px] font-bold tracking-wide btn-luxury text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-30" onClick={() => { onAddAccessory(accessoryPhoto!, accessoryCategory); setAccessoryPhoto(null); setAccessoryCategory(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={!accessoryPhoto}>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Add {accessoryCategory ? accessoryCategory.charAt(0).toUpperCase() + accessoryCategory.slice(1) : 'Accessory'}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Fullscreen Portal ── */}
        {showResultFullscreen && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[220] h-dvh w-screen overflow-hidden overscroll-none bg-black/95 flex flex-col items-center justify-center"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setShowResultFullscreen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setShowResultFullscreen(false)}
              className="absolute top-4 right-4 z-[221] h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Close full screen image"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            <motion.img
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              src={resultImage}
              alt="Try-on result full screen"
              className="max-w-[calc(100%-2rem)] max-h-[82dvh] w-auto h-auto rounded-2xl"
              onPointerDown={(e) => e.stopPropagation()}
            />
            {/* Fullscreen action buttons */}
            <div className="flex gap-3 mt-4">
              {shopUrl && (
                <button
                  onClick={() => { window.open(shopUrl, '_blank', 'noopener'); setShowResultFullscreen(false); }}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[12px] font-bold text-white bg-white/15 border border-white/20 backdrop-blur-sm active:scale-95 transition-transform"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Shop
                </button>
              )}
              <button
                onClick={() => { onTryAnother(); setShowResultFullscreen(false); }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[12px] font-bold text-white bg-white/15 border border-white/20 backdrop-blur-sm active:scale-95 transition-transform"
              >
                <RotateCcw className="h-3.5 w-3.5" /> New
              </button>
            </div>
          </motion.div>,
          document.body
        )}

        {/* Full-screen loading animation when adding accessories */}
        {addingAccessory && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-background/90 backdrop-blur-md flex items-center justify-center"
          >
            <TryOnLoadingAnimation stepIndex={accessoryStepIndex} />
          </motion.div>,
          document.body
        )}

        <p className="text-[10px] text-muted-foreground/50 text-center mt-1">We may earn a commission. It doesn't change your price.</p>
      </motion.div>

      {/* Background Swap Overlay — wrapped in ErrorBoundary for WASM safety */}
      <AnimatePresence>
        {showBgSwap && (
          <ErrorBoundary fallback={
            <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center gap-4 p-6">
              <p className="text-sm font-semibold text-foreground">Background swap unavailable</p>
              <p className="text-xs text-muted-foreground text-center">Your browser may not support this feature. Try sharing the original image instead.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowBgSwap(false)} className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground">Close</button>
                <button onClick={() => { setShowBgSwap(false); setTimeout(() => setShowBgSwap(true), 100); }} className="px-4 py-2 rounded-xl btn-luxury text-primary-foreground text-xs font-bold">Retry</button>
              </div>
            </div>
          }>
            <BackgroundSwapOverlay
              resultImageUrl={resultImage}
              onClose={() => setShowBgSwap(false)}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </>
  );
};

export default TryOnResultSection;
