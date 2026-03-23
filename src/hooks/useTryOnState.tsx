import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { detectBrandFromUrl, detectCategoryFromUrl } from '@/lib/retailerDetect';
import {
  getDefaultSharePreference, imageUrlToBase64,
  FREE_MONTHLY_LIMIT, getMonthlyTryOnCount, incrementTryOnCount,
  getServerTryOnCount, incrementServerTryOnCount,
} from '@/components/tryon/tryon-constants';
import type { CatalogProduct } from '@/hooks/useProductCatalog';
import {
  getGuestUuid, getGuestTryOnCount, incrementGuestTryOnCount,
  guestHasRemainingTryOns, GUEST_LIFETIME_LIMIT, FREE_DAILY_LIMIT,
} from '@/lib/guestSession';
import { compressPhoto } from '@/lib/imageUtils';

export type LookItem = { brand: string; name: string; url: string; price_cents?: number | null; image_url?: string | null };
export type WardrobeItem = { id: string; image_url: string; category: string; product_link: string | null };

const TRYON_STATE_KEY = 'dripcheck_tryon_state';
const TRYON_RESULT_KEY = 'dripcheck_tryon_result'; // localStorage — survives tab close
const TRYON_USER_PHOTO_KEY = 'dripcheck_tryon_user_photo'; // localStorage — persists until user changes

type PersistedQuickPick = {
  id: string;
  brand: string;
  retailer: string;
  category: string;
  name: string;
  image_url: string;
  product_url: string | null;
  price_cents: number | null;
} | null;

type PersistedTryOnState = {
  userPhoto: string | null;
  clothingPhoto: string | null;
  productLink: string;
  category: string;
  resultImage: string | null;
  lookItems: LookItem[];
  caption: string;
  autoSaved: boolean;
  shared: boolean;
  savedToItems: boolean;
  selectedQuickPick: PersistedQuickPick;
};

function loadPersistedTryOnState(): PersistedTryOnState {
  try {
    const raw = sessionStorage.getItem(TRYON_STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // Prefer localStorage result URL (small string, survives tab close)
    const savedResultUrl = localStorage.getItem(TRYON_RESULT_KEY);
    const savedUserPhoto = localStorage.getItem(TRYON_USER_PHOTO_KEY);
    return {
      userPhoto: savedUserPhoto || parsed.userPhoto || null,
      clothingPhoto: parsed.clothingPhoto || null,
      productLink: parsed.productLink || '',
      category: parsed.category || 'top',
      resultImage: savedResultUrl || parsed.resultImage || null,
      lookItems: parsed.lookItems || [],
      caption: parsed.caption || '',
      autoSaved: parsed.autoSaved || !!savedResultUrl,
      shared: !!parsed.shared,
      savedToItems: !!parsed.savedToItems,
      selectedQuickPick: parsed.selectedQuickPick || null,
    };
  } catch { /* ignore */ }
  return { userPhoto: null, clothingPhoto: null, productLink: '', category: 'top', resultImage: null, lookItems: [], caption: '', autoSaved: false, shared: false, savedToItems: false, selectedQuickPick: null };
}

export function useTryOnState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSubscribed, userGender: authGender } = useAuth();
  const userGender = authGender === 'male' ? 'mens' : authGender === 'female' ? 'womens' : null;
  const { toast } = useToast();
  const bodyProfile = (location.state as { bodyProfile?: unknown })?.bodyProfile;

  const persisted = loadPersistedTryOnState();

  const [userPhoto, setUserPhotoRaw] = useState<string | null>(persisted.userPhoto);
  const [clothingPhoto, setClothingPhotoRaw] = useState<string | null>(persisted.clothingPhoto);
  const [resultImage, setResultImageRaw] = useState<string | null>(persisted.resultImage);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [caption, setCaptionRaw] = useState(persisted.caption);
  const [isPublic, setIsPublic] = useState(() => getDefaultSharePreference());
  const [shared, setShared] = useState(persisted.shared);
  const [autoSaved, setAutoSaved] = useState(persisted.autoSaved);
  const [productLink, setProductLinkRaw] = useState(persisted.productLink);
  const [lookItems, setLookItemsRaw] = useState<LookItem[]>(persisted.lookItems);
  const [category, setCategoryRaw] = useState<string>(persisted.category);
  const [clothingSaved, setClothingSaved] = useState(false);
  const [backgroundSource, setBackgroundSource] = useState<'user' | 'clothing'>('user');

  // Persist critical state to sessionStorage so it survives mobile camera handoff reloads
  // NOTE: Only persist URLs — never large base64 strings
  const persistState = useCallback((updates: Partial<PersistedTryOnState>) => {
    try {
      const current = (() => { try { return JSON.parse(sessionStorage.getItem(TRYON_STATE_KEY) || '{}'); } catch { return {}; } })();
      const merged = { ...current, ...updates };
      // Skip persisting any value that looks like a large base64 string
      for (const key of ['userPhoto', 'clothingPhoto', 'resultImage'] as const) {
        if (typeof merged[key] === 'string' && merged[key].startsWith('data:')) delete merged[key];
      }
      sessionStorage.setItem(TRYON_STATE_KEY, JSON.stringify(merged));
    } catch { /* quota exceeded — silently skip */ }
  }, []);

  // Background upload: converts base64 to a storage URL for persistence
  const uploadInflightRef = useRef<Record<string, AbortController>>({});
  const eagerUpload = useCallback(async (base64: string, folder: string): Promise<string | null> => {
    if (!user) return null; // guests can't upload
    if (!base64.startsWith('data:')) return null; // already a URL
    // Abort any previous upload for this folder
    uploadInflightRef.current[folder]?.abort();
    const controller = new AbortController();
    uploadInflightRef.current[folder] = controller;
    try {
      const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
      const ext = match ? match[1].split('/')[1] : 'jpeg';
      const rawB64 = match ? match[2] : base64;
      const bytes = Uint8Array.from(atob(rawB64), c => c.charCodeAt(0));
      const fileName = `${user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('tryon-images').upload(fileName, bytes, { contentType: match ? match[1] : 'image/jpeg' });
      if (controller.signal.aborted) return null;
      if (error) { console.warn('Eager upload failed:', error.message); return null; }
      const { data: signedData } = await supabase.storage.from('tryon-images').createSignedUrl(fileName, 60 * 60 * 24 * 365);
      if (controller.signal.aborted) return null;
      return signedData?.signedUrl || null;
    } catch { return null; }
  }, [user]);

  const setUserPhoto = useCallback((v: string | null) => {
    setUserPhotoRaw(v);
    if (v && v.startsWith('data:')) {
      // Upload in background, swap to URL when done
      eagerUpload(v, 'user-staged').then(url => {
        if (url) {
          setUserPhotoRaw(url);
          persistState({ userPhoto: url });
          try { localStorage.setItem(TRYON_USER_PHOTO_KEY, url); } catch { /* ignore */ }
        }
      });
    } else if (v && (v.startsWith('http://') || v.startsWith('https://'))) {
      persistState({ userPhoto: v });
      try { localStorage.setItem(TRYON_USER_PHOTO_KEY, v); } catch { /* ignore */ }
    } else if (!v) {
      persistState({ userPhoto: null });
      try { localStorage.removeItem(TRYON_USER_PHOTO_KEY); } catch { /* ignore */ }
    }
  }, [persistState, eagerUpload]);

  const setClothingPhoto = useCallback((v: string | null) => {
    setClothingPhotoRaw(v);
    if (v && v.startsWith('data:')) {
      eagerUpload(v, 'clothing-staged').then(url => {
        if (url) {
          setClothingPhotoRaw(url);
          persistState({ clothingPhoto: url });
        }
      });
    } else {
      persistState({ clothingPhoto: v });
    }
  }, [persistState, eagerUpload]);

  const setProductLink = useCallback((v: string) => { setProductLinkRaw(v); persistState({ productLink: v }); }, [persistState]);
  const setCategory = useCallback((v: string) => { setCategoryRaw(v); persistState({ category: v }); }, [persistState]);
  const setResultImage = useCallback((v: string | null) => { setResultImageRaw(v); persistState({ resultImage: v }); }, [persistState]);
  const setLookItems = useCallback((v: LookItem[] | ((prev: LookItem[]) => LookItem[])) => {
    setLookItemsRaw(prev => { const next = typeof v === 'function' ? v(prev) : v; persistState({ lookItems: next }); return next; });
  }, [persistState]);
  const setCaption = useCallback((v: string) => { setCaptionRaw(v); persistState({ caption: v }); }, [persistState]);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [savedToItems, setSavedToItems] = useState(persisted.savedToItems);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [showPostUI, setShowPostUI] = useState(false);
  const [showLookItems, setShowLookItems] = useState(false);
  const [selectedQuickPick, setSelectedQuickPickRaw] = useState<CatalogProduct | null>(() => persisted.selectedQuickPick as CatalogProduct | null);
  const setSelectedQuickPick = useCallback((v: CatalogProduct | null) => {
    setSelectedQuickPickRaw(v);
    if (v) {
      persistState({ selectedQuickPick: { id: v.id, brand: v.brand, retailer: v.retailer, category: v.category, name: v.name, image_url: v.image_url, product_url: v.product_url ?? null, price_cents: v.price_cents ?? null } });
    } else {
      persistState({ selectedQuickPick: null });
    }
  }, [persistState]);
  const [layerHistory, setLayerHistory] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedRetailer, setSelectedRetailer] = useState<string | null>(null);
  const [selectedFit, setSelectedFit] = useState<string | null>(null);
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [addingAccessory, setAddingAccessory] = useState(false);

  const hasUnlimitedTryOns = isSubscribed;
  const [serverCount, setServerCount] = useState<number | null>(null);
  const remainingTryOns = Math.max(0, FREE_MONTHLY_LIMIT - (user ? (serverCount ?? 0) : getMonthlyTryOnCount()));
  const canGenerate = !!userPhoto && !!clothingPhoto;

  useEffect(() => {
    persistState({ shared });
  }, [shared, persistState]);

  useEffect(() => {
    persistState({ savedToItems });
  }, [savedToItems, persistState]);

  const [hasSavedProfile, setHasSavedProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dripcheck_scans') || '[]').length > 0; } catch { return false; }
  });

  // Fetch server count on mount
  useEffect(() => {
    if (!user || hasUnlimitedTryOns) return;
    getServerTryOnCount(supabase, user.id).then(setServerCount);
  }, [user, hasUnlimitedTryOns]);

  // Loading step progression
  useEffect(() => {
    if (!loading) { setLoadingStepIndex(0); return; }
    const timers = [
      setTimeout(() => setLoadingStepIndex(1), 3000),
      setTimeout(() => setLoadingStepIndex(2), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  // Check for saved body scan
  useEffect(() => {
    if (user && !hasSavedProfile) {
      supabase.from('body_scans').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
        if (data && data.length > 0) setHasSavedProfile(true);
      });
    }
  }, [user]);

  // Pre-populate clothing from catalog product selection
  useEffect(() => {
    const state = location.state as { clothingUrl?: string; clothingImageUrl?: string; productUrl?: string } | null;
    const clothingUrl = state?.clothingUrl || state?.clothingImageUrl;
    if (clothingUrl) {
      const loadAndApply = async () => {
        let photo: string;
        try {
          photo = await imageUrlToBase64(clothingUrl);
        } catch {
          photo = clothingUrl;
        }

        // If a result already exists, layer the new item as an accessory
        if (resultImage) {
          if (state?.productUrl) {
            setProductLink(state.productUrl);
            const detected = detectBrandFromUrl(state.productUrl);
            setLookItems(prev => [...prev, { brand: detected?.brand || '', name: '', url: state.productUrl!, image_url: clothingUrl }]);
          }
          // Trigger accessory generation on the existing result
          handleAddAccessory(photo, detectCategoryFromUrl(state?.productUrl || '') || null);
        } else {
          // No result yet — set as primary clothing
          setClothingPhoto(photo);
          if (state?.productUrl) setProductLink(state.productUrl);
          trackEvent('tryon_clothing_uploaded');
        }
      };
      loadAndApply();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch wardrobe
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

  const getAllUrls = () => {
    const allUrls = lookItems.map(i => i.url).filter(Boolean);
    const primaryUrl = productLink || selectedQuickPick?.product_url || null;
    if (primaryUrl && !allUrls.includes(primaryUrl)) allUrls.unshift(primaryUrl);
    return allUrls;
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
    } catch (err: unknown) {
      toast({ title: 'Save failed', description: (err as Error).message, variant: 'destructive' });
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
      const { error } = await supabase.from('tryon_posts').insert({ user_id: user!.id, user_photo_url: userUrl, clothing_photo_url: clothingUrl, result_photo_url: resultUrl, caption: null, is_public: false, product_urls: getAllUrls() });
      if (error) throw error;
      setAutoSaved(true);
      // Persist the uploaded URL (small string) so result survives navigation & tab close
      setResultImage(resultUrl);
      persistState({ autoSaved: true, resultImage: resultUrl, userPhoto: userUrl, clothingPhoto: clothingUrl });
      try { localStorage.setItem(TRYON_RESULT_KEY, resultUrl); } catch { /* ignore */ }
      trackEvent('tryon_saved');
      toast({ title: 'Saved to Profile', description: 'Your Try-On is saved privately.' });
    } catch (err: unknown) { console.error('Auto-save failed:', err); }
  };

  const [showAuthWall, setShowAuthWall] = useState(false);
  const [authWallReason, setAuthWallReason] = useState<'guest_limit' | 'daily_limit'>('guest_limit');

  const checkUsageLimit = async (): Promise<boolean> => {
    if (hasUnlimitedTryOns) return true;
    if (user) {
      const count = await getServerTryOnCount(supabase, user.id);
      setServerCount(count);
      if (count >= FREE_MONTHLY_LIMIT) { setShowPremiumGate(true); return false; }
    } else {
      // Guest mode — check local count
      if (!guestHasRemainingTryOns()) {
        setAuthWallReason('guest_limit');
        setShowAuthWall(true);
        return false;
      }
    }
    return true;
  };

  const incrementUsage = async () => {
    if (hasUnlimitedTryOns) return;
    if (user) {
      // Edge function already increments server-side count — just update local state
      setServerCount(prev => (prev ?? 0) + 1);
    } else {
      incrementGuestTryOnCount();
    }
  };

  const prepareTryOnImage = useCallback(async (input: string): Promise<string> => {
    if (!input?.startsWith('data:')) return input;
    try {
      return await compressPhoto(input, 1280, 0.82);
    } catch {
      return input;
    }
  }, []);

  const handleTryOn = async () => {
    if (!canGenerate) return;
    if (!(await checkUsageLimit())) return;
    setLoading(true);
    setResultImage(null);
    setDescription(null);
    setLookItems([]);
    setLayerHistory([]);
    trackEvent('tryon_started', { tier: user ? 'authenticated' : 'guest' });
    try {
      setTryOnError(null);
      const [preparedUserPhoto, preparedClothingPhoto] = await Promise.all([
        prepareTryOnImage(userPhoto!),
        prepareTryOnImage(clothingPhoto!),
      ]);

      const body: Record<string, unknown> = {
        userPhoto: preparedUserPhoto,
        clothingPhoto: preparedClothingPhoto,
        itemType: category || 'clothing',
        productName: selectedQuickPick?.name || '',
        productBrand: selectedQuickPick?.brand || '',
        productCategory: selectedQuickPick?.category || category || '',
        productUrl: selectedQuickPick?.product_url || productLink || '',
        backgroundSource,
      };
      // Pass guest UUID for unauthenticated users
      if (!user) {
        body.guestUuid = getGuestUuid();
      }
      const { data: resp, error } = await supabase.functions.invoke('virtual-tryon', { body });

      // Check for limit errors in both `error` and `resp` — supabase puts 
      // non-2xx response body in `data` but also sets `error`
      const errorPayload = resp?.error || (error && typeof resp === 'object' ? resp?.error : null);
      const errCode = errorPayload?.code;

      if (errCode === 'GUEST_LIMIT') {
        setAuthWallReason('guest_limit');
        setShowAuthWall(true);
        return;
      }
      if (errCode === 'DAILY_LIMIT') {
        setAuthWallReason('daily_limit');
        setShowAuthWall(true);
        return;
      }

      // For other errors, throw
      if (error) throw new Error(errorPayload?.message || error.message);
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;
      trackEvent('tryon_generated', { tier: user ? (payload.userTier || 'free') : 'guest' });
      if (payload.resultImage) {
        await incrementUsage();
        setResultImage(payload.resultImage);
        setShowSuccessOverlay(true);
        setTimeout(() => setShowSuccessOverlay(false), 1500);
        if (user) autoSaveToProfile(payload.resultImage);
      } else {
        // No image generated — don't consume credits
        const fallbackMsg = payload.description || 'The AI could not generate this try-on. Try different photos — well-lit, full body shots work best.';
        setTryOnError(fallbackMsg);
        toast({ title: 'Try-On couldn\'t generate', description: fallbackMsg, variant: 'destructive' });
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Generation failed. Please try again.';
      setTryOnError(msg);
      toast({ title: 'Try-On failed', description: msg, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleShare = async () => {
    if (!user) { toast({ title: 'Sign in to share', description: 'Create a free account to post your look.', variant: 'destructive' }); navigate('/auth'); return; }
    if (shared) {
      toast({ title: isPublic ? 'Already posted' : 'Already saved', description: 'This look has already been submitted.' });
      return;
    }
    try {
      const allUrls = getAllUrls();
      if (autoSaved) {
        const { data: latestPosts, error: latestError } = await supabase
          .from('tryon_posts')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (latestError) throw latestError;

        if (latestPosts && latestPosts.length > 0) {
          const { error: updateError } = await supabase
            .from('tryon_posts')
            .update({ caption: caption || null, is_public: isPublic, product_urls: allUrls })
            .eq('id', latestPosts[0].id);
          if (updateError) throw updateError;
        }
      } else {
        const [userUrl, clothingUrl, resultUrl] = await Promise.all([
          uploadBase64ToStorage(userPhoto!, 'user'),
          uploadBase64ToStorage(clothingPhoto!, 'clothing'),
          uploadBase64ToStorage(resultImage!, 'result'),
        ]);
        const { error: insertError } = await supabase
          .from('tryon_posts')
          .insert({ user_id: user.id, user_photo_url: userUrl, clothing_photo_url: clothingUrl, result_photo_url: resultUrl, caption: caption || null, is_public: isPublic, product_urls: allUrls });
        if (insertError) throw insertError;
      }
      setShared(true);
      setShowPostUI(false);
      trackEvent('tryon_posted', { isPublic });
      toast({ title: isPublic ? 'Posted to Style Check!' : 'Saved!', description: isPublic ? 'Your look is live — get feedback from the community.' : 'Caption updated.' });
    } catch (err: unknown) {
      toast({ title: 'Share failed', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const handleTryAnother = () => {
    // Keep user photo — only reset clothing, result, and session state
    setClothingPhoto(null); setResultImage(null); setDescription(null);
    setCaption(''); setIsPublic(getDefaultSharePreference()); setShared(false); setAutoSaved(false);
    setProductLink(''); setLookItems([]); setClothingSaved(false); setSavedToItems(false);
    setShowPostUI(false); setShowLookItems(false); setLayerHistory([]);
    setSelectedQuickPick(null);
    try { sessionStorage.removeItem(TRYON_STATE_KEY); localStorage.removeItem(TRYON_RESULT_KEY); } catch { /* ignore */ }
    // userPhoto persists in localStorage (TRYON_USER_PHOTO_KEY) automatically
  };

  const handleAddAccessory = async (accessoryPhoto: string, accessoryCategory: string | null) => {
    if (!resultImage || !accessoryPhoto) return;
    if (!(await checkUsageLimit())) return;
    setAddingAccessory(true);
    trackEvent('tryon_accessory_started', { category: accessoryCategory });
    try {
      const [preparedResultImage, preparedAccessoryPhoto] = await Promise.all([
        prepareTryOnImage(resultImage),
        prepareTryOnImage(accessoryPhoto),
      ]);

      const { data: resp, error } = await supabase.functions.invoke('virtual-tryon', {
        body: {
          userPhoto: preparedResultImage,
          clothingPhoto: preparedAccessoryPhoto,
          itemType: accessoryCategory || 'accessory',
          isLayering: true,
          productName: selectedQuickPick?.name || '',
          productBrand: selectedQuickPick?.brand || '',
        },
      });
      if (error) throw new Error(error.message);
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;
      await incrementUsage();
      if (payload.resultImage) {
        setLayerHistory(prev => [...prev, resultImage!]);
        setResultImage(payload.resultImage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        trackEvent('tryon_accessory_generated', { category: accessoryCategory });
        toast({ title: `${accessoryCategory || 'Accessory'} added!`, description: 'Keep adding items or finish your look.' });
        if (user) {
          try {
            const resultUrl = await uploadBase64ToStorage(payload.resultImage, 'result');
            const { data: latestPosts } = await supabase.from('tryon_posts').select('id, product_urls').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
            if (latestPosts && latestPosts.length > 0) {
              const existingUrls: string[] = (latestPosts[0].product_urls as string[]) || [];
              const merged = [...new Set([...getAllUrls(), ...existingUrls])];
              await supabase.from('tryon_posts').update({ result_photo_url: resultUrl, product_urls: merged }).eq('id', latestPosts[0].id);
            }
          } catch { /* silent */ }
        }
      } else {
        toast({ title: 'Could not add accessory', description: payload?.description || 'Try a clearer photo.', variant: 'destructive' });
      }
    } catch (err: unknown) {
      toast({ title: 'Accessory failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setAddingAccessory(false);
    }
  };

  const handleSelectProduct = async (product: CatalogProduct) => {
    setSelectedQuickPick(product);
    if (product.category) setCategory(product.category);

    // If a result already exists, layer the new item as an accessory instead of resetting
    if (resultImage) {
      if (product.product_url) {
        setProductLink(product.product_url);
        setLookItems(prev => [...prev, { brand: product.brand, name: product.name, url: product.product_url!, price_cents: product.price_cents, image_url: product.image_url }]);
      }
      trackEvent('tryon_add_item_to_result', { brand: product.brand, category: product.category });
      let photo: string;
      try { photo = await imageUrlToBase64(product.image_url); } catch { photo = product.image_url; }
      handleAddAccessory(photo, product.category || null);
      return;
    }

    // No result yet — set as primary clothing
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
    if (savedToItems) {
      toast({ title: 'Already saved', description: 'This item is already in your wardrobe.' });
      return;
    }
    try {
      if (productLink) {
        const { data: existing, error: existingError } = await supabase
          .from('clothing_wardrobe')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_link', productLink)
          .limit(1);
        if (existingError) throw existingError;
        if (existing && existing.length > 0) {
          setSavedToItems(true);
          toast({ title: 'Already saved', description: 'This item is already in your wardrobe.' });
          return;
        }
      }

      const imageUrl = await uploadBase64ToStorage(clothingPhoto, 'wardrobe');
      const detected = productLink ? detectBrandFromUrl(productLink) : null;
      const { error: insertError } = await supabase.from('clothing_wardrobe').insert({
        user_id: user.id,
        image_url: imageUrl,
        category: category || (productLink ? detectCategoryFromUrl(productLink) : null) || 'top',
        product_link: productLink || null,
        brand: selectedQuickPick?.brand || (detected?.brand && detected.brand !== detected.retailer ? detected.brand : null),
        retailer: selectedQuickPick?.retailer || detected?.retailer || null,
      });

      if (insertError) {
        if ((insertError as { code?: string }).code === '23505') {
          setSavedToItems(true);
          toast({ title: 'Already saved', description: 'This item is already in your wardrobe.' });
          return;
        }
        throw insertError;
      }

      setSavedToItems(true);
      trackEvent('saved_item_added', { source: 'tryon_wardrobe', category });
      toast({
        title: '✓ Saved to Wardrobe', description: 'View in your wardrobe anytime.',
        action: <button onClick={() => navigate('/profile', { state: { tab: 'wardrobe' } })} className="text-[11px] font-bold text-primary underline" aria-label="View your wardrobe">View Wardrobe</button>,
      });
    } catch (err: unknown) {
      toast({ title: 'Could not save', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const removeClothing = () => {
    setClothingPhoto(null);
    setSelectedQuickPick(null);
    setProductLink('');
    setClothingSaved(false);
    setLookItems([]);
  };

  return {
    // Auth & context
    user, userGender, bodyProfile, navigate, toast,
    // Photos
    userPhoto, setUserPhoto, clothingPhoto, setClothingPhoto,
    resultImage, description,
    // Loading
    loading, loadingStepIndex,
    // Post UI
    caption, setCaption, isPublic, setIsPublic, shared, showPostUI, setShowPostUI,
    // Product
    productLink, setProductLink, lookItems, setLookItems, category, setCategory,
    selectedQuickPick, selectedBrand, setSelectedBrand, selectedGenre, setSelectedGenre, selectedRetailer, setSelectedRetailer, selectedFit, setSelectedFit,
    // Wardrobe
    clothingSaved, wardrobeItems, showWardrobe, setShowWardrobe,
    // Background source
    backgroundSource, setBackgroundSource,
    // State flags
    showPremiumGate, setShowPremiumGate, savedToItems, showSuccessOverlay,
    showLookItems, layerHistory, hasSavedProfile,
    canGenerate, remainingTryOns, hasUnlimitedTryOns: !!hasUnlimitedTryOns,
    addingAccessory, tryOnError, autoSaved,
    // Guest auth wall
    showAuthWall, setShowAuthWall, authWallReason,
    // Handlers
    handleTryOn, handleShare, handleTryAnother, handleAddAccessory,
    handleSelectProduct, handleSaveToItems,
    saveClothingToWardrobe, selectFromWardrobe, removeClothing,
  };
}
