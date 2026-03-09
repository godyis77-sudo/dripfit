import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Loader2, Check, Info, ShoppingBag, Store, Shield, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { detectBrandFromUrl, detectCategoryFromUrl } from '@/lib/retailerDetect';
import BottomTabBar from '@/components/BottomTabBar';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import TryOnUploadSection from '@/components/tryon/TryOnUploadSection';
import TryOnResultSection from '@/components/tryon/TryOnResultSection';
import TryOnPremiumGate from '@/components/tryon/TryOnPremiumGate';
import BrandFilter from '@/components/tryon/BrandFilter';
import {
  CATEGORIES, ALL_PRODUCT_CATEGORIES,
  getDefaultSharePreference, imageUrlToBase64,
  FREE_MONTHLY_LIMIT, getMonthlyTryOnCount, incrementTryOnCount,
  getServerTryOnCount, incrementServerTryOnCount,
} from '@/components/tryon/tryon-constants';
import type { CatalogProduct } from '@/hooks/useProductCatalog';

const TryOn = () => {
  const navigate = useNavigate();
  usePageTitle('Virtual Try-On');
  const location = useLocation();
  const { user, isSubscribed, userGender: authGender } = useAuth();
  const userGender = authGender === 'male' ? 'mens' : authGender === 'female' ? 'womens' : null;
  const { toast } = useToast();
  const bodyProfile = (location.state as any)?.bodyProfile;

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [clothingPhoto, setClothingPhoto] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(() => getDefaultSharePreference());
  const [shared, setShared] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [productLink, setProductLink] = useState('');
  const [lookItems, setLookItems] = useState<Array<{ brand: string; name: string; url: string; price_cents?: number | null; image_url?: string | null }>>([]);
  const [category, setCategory] = useState<string>('top');
  const [clothingSaved, setClothingSaved] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState<Array<{ id: string; image_url: string; category: string; product_link: string | null }>>([]);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [savedToItems, setSavedToItems] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showPostUI, setShowPostUI] = useState(false);
  const [showLookItems, setShowLookItems] = useState(false);
  const [selectedQuickPick, setSelectedQuickPick] = useState<CatalogProduct | null>(null);
  const [layerHistory, setLayerHistory] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [tryOnError, setTryOnError] = useState<string | null>(null);

  const hasUnlimitedTryOns = isSubscribed;
  const [serverCount, setServerCount] = useState<number | null>(null);
  const remainingTryOns = Math.max(0, FREE_MONTHLY_LIMIT - (user ? (serverCount ?? 0) : getMonthlyTryOnCount()));
  const canGenerate = !!userPhoto && !!clothingPhoto;

  // Fetch server count on mount / user change
  useEffect(() => {
    if (!user || hasUnlimitedTryOns) return;
    getServerTryOnCount(supabase, user.id).then(setServerCount);
  }, [user, hasUnlimitedTryOns]);

  const [hasSavedProfile, setHasSavedProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dripcheck_scans') || '[]').length > 0; } catch { return false; }
  });

  // Loading step progression
  useEffect(() => {
    if (!loading) { setLoadingStepIndex(0); return; }
    const timers = [
      setTimeout(() => setLoadingStepIndex(1), 3000),
      setTimeout(() => setLoadingStepIndex(2), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  useEffect(() => {
    if (user && !hasSavedProfile) {
      supabase.from('body_scans').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
        if (data && data.length > 0) setHasSavedProfile(true);
      });
    }
  }, [user]);

  // Pre-populate clothing from catalog product selection
  useEffect(() => {
    const state = location.state as any;
    const clothingUrl = state?.clothingUrl || state?.clothingImageUrl;
    if (clothingUrl) {
      imageUrlToBase64(clothingUrl)
        .then(base64 => {
          setClothingPhoto(base64);
          if (state.productUrl) setProductLink(state.productUrl);
          trackEvent('tryon_clothing_uploaded');
        })
        .catch(() => {
          setClothingPhoto(clothingUrl);
          if (state.productUrl) setProductLink(state.productUrl);
        });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (user) {
      supabase.from('clothing_wardrobe').select('id, image_url, category, product_link').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => { if (data) setWardrobeItems(data); });
    }
  }, [user]);

  const uploadBase64ToStorage = async (input: string, folder: string): Promise<string> => {
    if (input.startsWith('http://') || input.startsWith('https://')) return input;
    const match = input.match(/^data:(image\/\w+);base64,(.+)$/);
    const ext = match ? match[1].split('/')[1] : 'jpeg';
    const rawB64 = match ? match[2] : input;
    const bytes = Uint8Array.from(atob(rawB64), c => c.charCodeAt(0));
    const fileName = `${user!.id}/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('tryon-images').upload(fileName, bytes, { contentType: match ? match[1] : 'image/jpeg' });
    if (error) throw error;
    const { data: signedData, error: signError } = await supabase.storage.from('tryon-images').createSignedUrl(fileName, 60 * 60 * 24 * 365);
    if (signError || !signedData?.signedUrl) throw signError || new Error('Failed to create signed URL');
    return signedData.signedUrl;
  };

  const saveClothingToWardrobe = async () => {
    if (!user || !clothingPhoto || clothingSaved) return;
    try {
      const imageUrl = await uploadBase64ToStorage(clothingPhoto, 'wardrobe');
      const detected = productLink ? detectBrandFromUrl(productLink) : null;
      await supabase.from('clothing_wardrobe').insert({
        user_id: user.id, image_url: imageUrl, category: category || (productLink ? detectCategoryFromUrl(productLink) : null) || 'top', product_link: productLink || null,
        brand: detected?.brand && detected.brand !== detected.retailer ? detected.brand : null,
        retailer: detected?.retailer || null,
      });
      setClothingSaved(true);
      trackEvent('saved_item_added', { source: 'tryon_wardrobe', category });
      toast({ title: 'Saved to Wardrobe', description: 'Clothing saved as a potential buy outfit.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  const selectFromWardrobe = async (item: { image_url: string; product_link: string | null; category: string }) => {
    if (item.product_link) setProductLink(item.product_link);
    setCategory(item.category);
    const base64 = await imageUrlToBase64(item.image_url);
    setClothingPhoto(base64);
    setShowWardrobe(false);
    setClothingSaved(true);
    trackEvent('tryon_clothing_uploaded');
  };

  const autoSaveToProfile = async (resultBase64: string) => {
    try {
      const [userUrl, clothingUrl, resultUrl] = await Promise.all([
        uploadBase64ToStorage(userPhoto!, 'user'),
        uploadBase64ToStorage(clothingPhoto!, 'clothing'),
        uploadBase64ToStorage(resultBase64, 'result'),
      ]);
      const allUrls = lookItems.map(i => i.url).filter(Boolean);
      const primaryUrl = productLink || selectedQuickPick?.product_url || null;
      if (primaryUrl && !allUrls.includes(primaryUrl)) allUrls.unshift(primaryUrl);
      const { error } = await supabase.from('tryon_posts').insert({ user_id: user!.id, user_photo_url: userUrl, clothing_photo_url: clothingUrl, result_photo_url: resultUrl, caption: null, is_public: false, product_urls: allUrls });
      if (error) throw error;
      setAutoSaved(true);
      trackEvent('tryon_saved');
      toast({ title: 'Saved to Profile', description: 'Your Try-On is saved privately.' });
    } catch (err: any) { console.error('Auto-save failed:', err); }
  };

  const handleTryOn = async () => {
    if (!canGenerate) return;
    if (!hasUnlimitedTryOns) {
      if (user) {
        const count = await getServerTryOnCount(supabase, user.id);
        setServerCount(count);
        if (count >= FREE_MONTHLY_LIMIT) { setShowPremiumGate(true); return; }
      } else if (getMonthlyTryOnCount() >= FREE_MONTHLY_LIMIT) { setShowPremiumGate(true); return; }
    }
    setLoading(true);
    setResultImage(null);
    setDescription(null);
    trackEvent('tryon_started');
    try {
      setTryOnError(null);
      const { data: resp, error } = await supabase.functions.invoke('virtual-tryon', { body: { userPhoto, clothingPhoto, itemType: category || 'clothing' } });
      if (error) throw new Error(error.message);
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;
      trackEvent('tryon_generated');
      if (!hasUnlimitedTryOns) {
        if (user) {
          await incrementServerTryOnCount(supabase, user.id);
          setServerCount(prev => (prev ?? 0) + 1);
        } else {
          incrementTryOnCount();
        }
      }
      if (payload.resultImage) { setResultImage(payload.resultImage); setShowSuccessOverlay(true); setTimeout(() => setShowSuccessOverlay(false), 1500); if (user) autoSaveToProfile(payload.resultImage); }
      else if (payload.description) { setDescription(payload.description); }
    } catch (err: any) {
      const msg = err.message || 'Generation failed. Please try again.';
      setTryOnError(msg);
      toast({ title: 'Try-On failed', description: msg, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleShare = async () => {
    if (!user) { toast({ title: 'Sign in to share', description: 'Create a free account to post your look.', variant: 'destructive' }); navigate('/auth'); return; }
    setShared(true);
    trackEvent('tryon_posted', { isPublic });
    try {
      if (autoSaved) {
        const { data: latestPosts } = await supabase.from('tryon_posts').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        const allUrls = lookItems.map(i => i.url).filter(Boolean);
        const primaryUrl = productLink || selectedQuickPick?.product_url || null;
        if (primaryUrl && !allUrls.includes(primaryUrl)) allUrls.unshift(primaryUrl);
        if (latestPosts && latestPosts.length > 0) await supabase.from('tryon_posts').update({ caption: caption || null, is_public: isPublic, product_urls: allUrls }).eq('id', latestPosts[0].id);
      } else {
        const [userUrl, clothingUrl, resultUrl] = await Promise.all([
          uploadBase64ToStorage(userPhoto!, 'user'),
          uploadBase64ToStorage(clothingPhoto!, 'clothing'),
          uploadBase64ToStorage(resultImage!, 'result'),
        ]);
        const allUrls = lookItems.map(i => i.url).filter(Boolean);
        const primaryUrl = productLink || selectedQuickPick?.product_url || null;
        if (primaryUrl && !allUrls.includes(primaryUrl)) allUrls.unshift(primaryUrl);
        await supabase.from('tryon_posts').insert({ user_id: user.id, user_photo_url: userUrl, clothing_photo_url: clothingUrl, result_photo_url: resultUrl, caption: caption || null, is_public: isPublic, product_urls: allUrls });
      }
      toast({ title: isPublic ? 'Posted to Style Check!' : 'Saved!', description: isPublic ? 'Your look is live — get feedback from the community.' : 'Caption updated.' });
    } catch (err: any) {
      setShared(false);
      toast({ title: 'Share failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleTryAnother = () => {
    setUserPhoto(null); setClothingPhoto(null); setResultImage(null); setDescription(null);
    setCaption(''); setIsPublic(getDefaultSharePreference()); setShared(false); setAutoSaved(false);
    setProductLink(''); setLookItems([]); setClothingSaved(false); setSavedToItems(false);
    setShowPostUI(false); setShowLookItems(false); setLayerHistory([]);
    setSelectedQuickPick(null);
  };

  const handleAddAccessory = async (accessoryPhoto: string, accessoryCategory: string | null) => {
    if (!resultImage || !accessoryPhoto) return;
    if (!hasUnlimitedTryOns) {
      if (user) {
        const count = await getServerTryOnCount(supabase, user.id);
        if (count >= FREE_MONTHLY_LIMIT) { setShowPremiumGate(true); return; }
      } else if (getMonthlyTryOnCount() >= FREE_MONTHLY_LIMIT) { setShowPremiumGate(true); return; }
    }
    trackEvent('tryon_accessory_started', { category: accessoryCategory });
    try {
      const { data: resp, error } = await supabase.functions.invoke('virtual-tryon', { body: { userPhoto: resultImage, clothingPhoto: accessoryPhoto, itemType: accessoryCategory || 'accessory', isLayering: true } });
      if (error) throw new Error(error.message);
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;
      if (!hasUnlimitedTryOns) {
        if (user) {
          await incrementServerTryOnCount(supabase, user.id);
          setServerCount(prev => (prev ?? 0) + 1);
        } else {
          incrementTryOnCount();
        }
      }
      if (payload.resultImage) {
        setLayerHistory(prev => [...prev, resultImage!]);
        setResultImage(payload.resultImage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        trackEvent('tryon_accessory_generated', { category: accessoryCategory });
        toast({ title: `${accessoryCategory || 'Accessory'} added!`, description: 'Keep adding items or finish your look.' });
        if (user) {
          try {
            const resultUrl = await uploadBase64ToStorage(data.resultImage, 'result');
            const { data: latestPosts } = await supabase.from('tryon_posts').select('id, product_urls').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
            if (latestPosts && latestPosts.length > 0) {
              const existingUrls: string[] = (latestPosts[0].product_urls as string[]) || [];
              const newUrls = lookItems.map(i => i.url).filter(Boolean);
              const primaryUrl = productLink || selectedQuickPick?.product_url || null;
              const merged = [...new Set([...(primaryUrl ? [primaryUrl] : []), ...existingUrls, ...newUrls])];
              await supabase.from('tryon_posts').update({ result_photo_url: resultUrl, product_urls: merged }).eq('id', latestPosts[0].id);
            }
          } catch { /* silent */ }
        }
      } else {
        toast({ title: 'Could not add accessory', description: data?.description || 'Try a clearer photo.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Accessory failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleSelectProduct = async (product: CatalogProduct) => {
    setSelectedQuickPick(product);
    if (product.category) setCategory(product.category);
    if (product.product_url) {
      setProductLink(product.product_url);
      setLookItems([{ brand: product.brand, name: product.name, url: product.product_url, price_cents: product.price_cents, image_url: product.image_url }]);
    }
    trackEvent('tryon_clothing_uploaded');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const base64 = await imageUrlToBase64(product.image_url);
      setClothingPhoto(base64);
    } catch {
      setClothingPhoto(product.image_url);
    }
  };

  const handleSaveToItems = async () => {
    if (!user || !clothingPhoto) return;
    try {
      const imageUrl = await uploadBase64ToStorage(clothingPhoto, 'wardrobe');
      const detected = productLink ? detectBrandFromUrl(productLink) : null;
      await supabase.from('clothing_wardrobe').insert({
        user_id: user.id,
        image_url: imageUrl,
        category: category || (productLink ? detectCategoryFromUrl(productLink) : null) || 'top',
        product_link: productLink || null,
        brand: selectedQuickPick?.brand || (detected?.brand && detected.brand !== detected.retailer ? detected.brand : null),
        retailer: selectedQuickPick?.retailer || detected?.retailer || null,
      });
      setSavedToItems(true);
      trackEvent('saved_item_added', { source: 'tryon_wardrobe', category });
      toast({
        title: '✓ Saved to Wardrobe', description: 'View in your wardrobe anytime.',
        action: <button onClick={() => navigate('/profile', { state: { tab: 'wardrobe' } })} className="text-[11px] font-bold text-primary underline">View Wardrobe</button>,
      });
    } catch {
      toast({ title: 'Could not save', variant: 'destructive' });
    }
  };

  const [addingAccessory, setAddingAccessory] = useState(false);
  const wrappedAddAccessory = async (photo: string, cat: string | null) => {
    setAddingAccessory(true);
    try { await handleAddAccessory(photo, cat); } finally { setAddingAccessory(false); }
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-bottom">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-foreground">Try-On</h1>
            <p className="text-[10px] text-muted-foreground">See how it looks before you buy</p>
          </div>
        </div>

        {/* Body profile badge */}
        {(hasSavedProfile || bodyProfile) && !resultImage && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3">
            <div>
              <p className="text-[11px] font-bold text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Body Profile Active</p>
              <p className="text-[10px] text-muted-foreground">Your measurements improve try-on accuracy</p>
            </div>
          </div>
        )}

        {!resultImage ? (
          <>
            <TryOnUploadSection
              userPhoto={userPhoto}
              clothingPhoto={clothingPhoto}
              productLink={productLink}
              clothingSaved={clothingSaved}
              wardrobeItems={wardrobeItems}
              showWardrobe={showWardrobe}
              user={user}
              onUserPhotoChange={setUserPhoto}
              onClothingPhotoChange={setClothingPhoto}
              onProductLinkChange={setProductLink}
              onSaveClothingToWardrobe={saveClothingToWardrobe}
              onSelectFromWardrobe={selectFromWardrobe}
              onToggleWardrobe={() => setShowWardrobe(!showWardrobe)}
              onToast={toast}
              onRemoveClothing={() => { setClothingPhoto(null); setSelectedQuickPick(null); setProductLink(''); setClothingSaved(false); setLookItems([]); }}
              onBrowseProducts={() => { setClothingPhoto(null); setSelectedQuickPick(null); setProductLink(''); setClothingSaved(false); setLookItems([]); }}
            />

            {/* Category selector */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Category</p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setCategory('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all active:scale-95 ${category === 'all' ? 'border-primary bg-primary text-primary-foreground font-bold' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                  🛍️ All
                </button>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setCategory(c.key)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all active:scale-95 ${category === c.key ? 'border-primary bg-primary text-primary-foreground font-bold' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand filter */}
            {!clothingPhoto && (
              <BrandFilter
                gender={userGender}
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
              />
            )}

            {/* Product catalog browse */}
            {!clothingPhoto && (
              <div className="mb-3 space-y-2">
                <p className="section-label mb-1.5">{category === 'all' ? 'All Products' : `Shop ${CATEGORIES.find(c => c.key === category)?.label || category}`}</p>
                {category === 'all' ? (
                  ALL_PRODUCT_CATEGORIES.map(cat => (
                    <CategoryProductGrid key={cat.key} category={cat.key} title={cat.label} collapsed={false} maxItems={1000} seed={1234} gender={userGender || undefined} brand={selectedBrand || undefined} onSelectProduct={handleSelectProduct} />
                  ))
                ) : (
                  <CategoryProductGrid category={category} title={`Shop ${CATEGORIES.find(c => c.key === category)?.label || category}`} collapsed={false} maxItems={1000} seed={1234} gender={userGender || undefined} brand={selectedBrand || undefined} onSelectProduct={handleSelectProduct} />
                )}
              </div>
            )}

            {/* Retailer link for selected Quick Pick */}
            {selectedQuickPick?.product_url && (
              <div className="mb-3 p-3 rounded-xl bg-primary/5 border-2 border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" /> Shop {selectedQuickPick.name}
                  </p>
                  <button onClick={() => setSelectedQuickPick(null)} aria-label="Remove product" className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <a href={selectedQuickPick.product_url} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackEvent('quickpick_retailer_clicked', { retailer: selectedQuickPick.retailer, item: selectedQuickPick.name })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-xs font-bold text-primary hover:bg-primary/25 transition-colors active:scale-95"
                >
                  <Store className="h-3.5 w-3.5" /> {selectedQuickPick.retailer} — {selectedQuickPick.brand}
                </a>
              </div>
            )}

            {/* Generate CTA */}
            <Button className="w-full h-11 rounded-lg text-sm font-bold btn-luxury text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-30" onClick={handleTryOn} disabled={loading || !canGenerate}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating your preview…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Try-On</>}
            </Button>

            {tryOnError && !loading && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-[12px] text-destructive text-center">{tryOnError}</p>
                <Button variant="outline" size="sm" className="rounded-lg text-[12px] border-destructive/30 text-destructive hover:bg-destructive/5" onClick={handleTryOn}>
                  Try again
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center mt-3 mb-1 gap-2">
                <p className="text-[11px] text-muted-foreground font-medium">
                  {loadingStepIndex === 0 && 'Analysing your body scan…'}
                  {loadingStepIndex === 1 && 'Compositing the outfit…'}
                  {loadingStepIndex === 2 && 'Finalising your preview…'}
                </p>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${i <= loadingStepIndex ? 'bg-primary' : 'border border-muted-foreground/40'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {!canGenerate && !loading && (
              <p className="text-[10px] text-muted-foreground text-center mt-1.5 mb-1">
                {!userPhoto && !clothingPhoto ? 'Upload your photo and a clothing item to start' : !userPhoto ? 'Upload your photo to continue' : 'Upload a clothing item to continue'}
              </p>
            )}
            {canGenerate && !loading && (
              <p className="text-[10px] text-primary font-medium text-center mt-1.5 mb-1 flex items-center justify-center gap-1">
                <Check className="h-3 w-3" /> Ready to generate
              </p>
            )}

            <div className="flex items-start gap-1.5 bg-card border border-border rounded-lg px-3 py-2 mt-2 mb-3">
              <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">AI preview — actual fit, drape, and texture may vary. Use your Scan profile for the most accurate sizing.</p>
            </div>
          </>
        ) : (
          <TryOnResultSection
            resultImage={resultImage}
            clothingPhoto={clothingPhoto}
            category={category}
            productLink={productLink}
            selectedQuickPick={selectedQuickPick}
            lookItems={lookItems}
            showLookItems={showLookItems}
            user={user}
            isPublic={isPublic}
            caption={caption}
            shared={shared}
            showPostUI={showPostUI}
            showSuccessOverlay={showSuccessOverlay}
            savedToItems={savedToItems}
            layerHistory={layerHistory}
            userGender={userGender}
            hasUnlimitedTryOns={!!hasUnlimitedTryOns}
            addingAccessory={addingAccessory}
            onSetCaption={setCaption}
            onSetIsPublic={setIsPublic}
            onSetShowPostUI={setShowPostUI}
            onShare={handleShare}
            onTryAnother={handleTryAnother}
            onSaveToItems={handleSaveToItems}
            onAddAccessory={wrappedAddAccessory}
            onSetLookItems={setLookItems}
            onToast={toast}
          />
        )}

        {description && !resultImage && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[13px] text-foreground/80">{description}</p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1 mt-3 mb-2">
          <Shield className="h-3 w-3" /> Private by default · delete anytime
        </p>

        {!resultImage && !hasUnlimitedTryOns && remainingTryOns <= FREE_MONTHLY_LIMIT && (
          <p className="text-[9px] text-muted-foreground/60 text-center mb-2">
            {remainingTryOns} free try-on{remainingTryOns !== 1 ? 's' : ''} left this month
          </p>
        )}
      </div>

      {showPremiumGate && <TryOnPremiumGate onClose={() => setShowPremiumGate(false)} />}
      <BottomTabBar />
    </div>
  );
};

export default TryOn;
