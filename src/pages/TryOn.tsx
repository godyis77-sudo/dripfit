import { useState, useRef, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { ArrowLeft, Shirt, Sparkles, Loader2, Share2, Shield, User, Check, Link2, Info, MessageSquare, Save, RotateCcw, Store, ShoppingBag, Camera, ImageIcon, Bookmark, FolderOpen, Crown, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { buildRetailerSearchUrl } from '@/lib/retailerLinks';
import BottomTabBar from '@/components/BottomTabBar';
import { FullscreenImage } from '@/components/ui/fullscreen-image';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';

import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';

const SHARE_PREF_KEY = 'drip_default_share_preference';
const SHARE_PREF_TS_KEY = 'drip_default_share_preference_ts';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getDefaultSharePreference(): boolean {
  const saved = localStorage.getItem(SHARE_PREF_KEY);
  if (saved === null) return true; // default ON for new users
  const ts = localStorage.getItem(SHARE_PREF_TS_KEY);
  if (ts && Date.now() - Number(ts) > SEVEN_DAYS_MS) return true; // reset after 7 days
  return saved === 'true';
}

function saveSharePreference(value: boolean) {
  localStorage.setItem(SHARE_PREF_KEY, String(value));
  localStorage.setItem(SHARE_PREF_TS_KEY, String(Date.now()));
}

const CATEGORIES = [
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'dress', label: 'Dress' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'full', label: 'Full Look' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'bags', label: 'Bags' },
  { key: 'hats', label: 'Hats' },
] as const;

const ACCESSORY_CATEGORIES = [
  { key: 'shoes', label: '👟 Shoes', icon: '👟' },
  { key: 'hats', label: '🧢 Hats', icon: '🧢' },
  { key: 'necklace', label: '📿 Necklace', icon: '📿' },
  { key: 'earrings', label: '✨ Earrings', icon: '✨' },
  { key: 'bracelet', label: '⌚ Bracelet', icon: '⌚' },
  { key: 'watch', label: '⌚ Watch', icon: '⌚' },
  { key: 'jewelry', label: '💎 Jewelry', icon: '💎' },
  { key: 'bags', label: '👜 Bags', icon: '👜' },
  { key: 'sunglasses', label: '🕶️ Sunglasses', icon: '🕶️' },
] as const;

// Quick picks now powered by product catalog — no static assets needed

// buildRetailerSearchUrl is imported from @/lib/retailerLinks

const FIT_CHECK_PROMPTS = [
  'Should I buy this for work?',
  'Date night — yes or no?',
  'Casual Friday vibes?',
  'Too bold or just right?',
];

const TryOn = () => {
  const navigate = useNavigate();
  usePageTitle('Virtual Try-On');
  const location = useLocation();
  const { user, isSubscribed } = useAuth();
  const { toast } = useToast();
  const userPhotoRef = useRef<HTMLInputElement>(null);
  const userCameraRef = useRef<HTMLInputElement>(null);
  const clothingPhotoRef = useRef<HTMLInputElement>(null);
  const clothingCameraRef = useRef<HTMLInputElement>(null);
  const bodyProfile = (location.state as any)?.bodyProfile;

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [clothingPhoto, setClothingPhoto] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(() => getDefaultSharePreference());
  const [shared, setShared] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [productLink, setProductLink] = useState('');
  const [category, setCategory] = useState<string>('top');
  const [clothingSaved, setClothingSaved] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState<Array<{ id: string; image_url: string; category: string; product_link: string | null }>>([]);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [savedToItems, setSavedToItems] = useState(false);
  const [selectedQuickPick, setSelectedQuickPick] = useState<CatalogProduct | null>(null);
  const [retailerMap, setRetailerMap] = useState<Record<string, { website_url: string }>>({});
  // Multi-item accessory layering
  const [accessoryPhoto, setAccessoryPhoto] = useState<string | null>(null);
  const [accessoryCategory, setAccessoryCategory] = useState<string | null>(null);
  const [addingAccessory, setAddingAccessory] = useState(false);
  const [layerHistory, setLayerHistory] = useState<string[]>([]);
  const accessoryPhotoRef = useRef<HTMLInputElement>(null);
  const accessoryCameraRef = useRef<HTMLInputElement>(null);

  const FREE_MONTHLY_LIMIT = 3;
  const hasUnlimitedTryOns = isSubscribed || user?.email?.toLowerCase() === 'godyis77@gmail.com';

  const getMonthlyTryOnCount = (): number => {
    const now = new Date();
    const key = `drip_tryons_${now.getFullYear()}_${now.getMonth()}`;
    return parseInt(localStorage.getItem(key) || '0', 10);
  };

  const incrementTryOnCount = () => {
    const now = new Date();
    const key = `drip_tryons_${now.getFullYear()}_${now.getMonth()}`;
    localStorage.setItem(key, String(getMonthlyTryOnCount() + 1));
  };

  const remainingTryOns = Math.max(0, FREE_MONTHLY_LIMIT - getMonthlyTryOnCount());

  const [hasSavedProfile, setHasSavedProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dripcheck_scans') || '[]').length > 0; } catch { return false; }
  });

  // Also check database for saved profile
  useEffect(() => {
    if (user && !hasSavedProfile) {
      supabase.from('body_scans').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
        if (data && data.length > 0) setHasSavedProfile(true);
      });
    }
  }, [user]);
  const canGenerate = !!userPhoto && !!clothingPhoto;

  // Fetch retailers from database
  useEffect(() => {
    supabase.from('retailers').select('name, website_url').eq('is_active', true).then(({ data }) => {
      if (data) {
        const map: Record<string, { website_url: string }> = {};
        data.forEach((r: any) => { map[r.name] = { website_url: r.website_url }; });
        setRetailerMap(map);
      }
    });
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from('clothing_wardrobe' as any).select('id, image_url, category, product_link').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => { if (data) setWardrobeItems(data as any); });
    }
  }, [user]);

  const selectFromWardrobe = async (item: { image_url: string; product_link: string | null; category: string }) => {
    if (item.product_link) setProductLink(item.product_link);
    setCategory(item.category);
    const base64 = await imageUrlToBase64(item.image_url);
    setClothingPhoto(base64);
    setShowWardrobe(false);
    setClothingSaved(true);
    trackEvent('tryon_clothing_uploaded');
  };

  const imageUrlToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const compressImage = (file: File, maxDim = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Failed to load image')); };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = (setter: (v: string) => void, type: 'photo' | 'clothing') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const compressed = await compressImage(file);
      setter(compressed);
      trackEvent(type === 'photo' ? 'tryon_photo_uploaded' : 'tryon_clothing_uploaded');
    } catch (err) {
      toast({ title: 'Image load failed', description: 'Try a different photo.', variant: 'destructive' });
    }
  };

  const handleTryOn = async () => {
    if (!canGenerate) return;
    if (!hasUnlimitedTryOns && getMonthlyTryOnCount() >= FREE_MONTHLY_LIMIT) {
      setShowPremiumGate(true);
      return;
    }
    setLoading(true);
    setResultImage(null);
    setDescription(null);
    trackEvent('tryon_started');
    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', { body: { userPhoto, clothingPhoto } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      trackEvent('tryon_generated');
      if (!hasUnlimitedTryOns) incrementTryOnCount();
      if (data.resultImage) { setResultImage(data.resultImage); if (user) autoSaveToProfile(data.resultImage); }
      else if (data.description) { setDescription(data.description); }
    } catch (err: any) {
      toast({ title: 'Try-On failed', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const uploadBase64ToStorage = async (base64: string, folder: string): Promise<string> => {
    const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
    const ext = match ? match[1].split('/')[1] : 'jpeg';
    const data = match ? match[2] : base64;
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
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
      await supabase.from('clothing_wardrobe' as any).insert({
        user_id: user.id,
        image_url: imageUrl,
        category,
        product_link: productLink || null,
        retailer: (() => { try { const h = new URL(productLink).hostname; const m = ['shein','zara','hm','gap','nordstrom','lululemon','macys','jcpenney','aritzia','simons'].find(r => h.includes(r)); return m || null; } catch { return null; } })(),
      } as any);
      setClothingSaved(true);
      trackEvent('saved_item_added', { source: 'tryon_wardrobe', category });
      toast({ title: 'Saved to Wardrobe', description: 'Clothing saved as a potential buy outfit.' });
    } catch (err: any) {
      console.error('Save to wardrobe failed:', err);
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  const autoSaveToProfile = async (resultBase64: string) => {
    try {
      const [userUrl, clothingUrl, resultUrl] = await Promise.all([
        uploadBase64ToStorage(userPhoto!, 'user'),
        uploadBase64ToStorage(clothingPhoto!, 'clothing'),
        uploadBase64ToStorage(resultBase64, 'result'),
      ]);
      const { error } = await supabase.from('tryon_posts').insert({ user_id: user!.id, user_photo_url: userUrl, clothing_photo_url: clothingUrl, result_photo_url: resultUrl, caption: null, is_public: false });
      if (error) throw error;
      setAutoSaved(true);
      trackEvent('tryon_saved');
      toast({ title: 'Saved to Profile', description: 'Your Try-On is saved privately.' });
    } catch (err: any) { console.error('Auto-save failed:', err); }
  };

  const handleShare = async () => {
    if (!user) { toast({ title: 'Sign in to share', description: 'Create a free account to post your look.', variant: 'destructive' }); navigate('/auth'); return; }
    setShared(true);
    trackEvent('tryon_posted', { isPublic });
    try {
      if (autoSaved) {
        const { data: latestPosts } = await supabase.from('tryon_posts').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        if (latestPosts && latestPosts.length > 0) await supabase.from('tryon_posts').update({ caption: caption || null, is_public: isPublic }).eq('id', latestPosts[0].id);
      } else {
        const [userUrl, clothingUrl, resultUrl] = await Promise.all([
          uploadBase64ToStorage(userPhoto!, 'user'),
          uploadBase64ToStorage(clothingPhoto!, 'clothing'),
          uploadBase64ToStorage(resultImage!, 'result'),
        ]);
        await supabase.from('tryon_posts').insert({ user_id: user.id, user_photo_url: userUrl, clothing_photo_url: clothingUrl, result_photo_url: resultUrl, caption: caption || null, is_public: isPublic });
      }
      toast({ title: isPublic ? 'Posted to Style Check!' : 'Saved!', description: isPublic ? 'Your look is live — get feedback from the community.' : 'Caption updated.' });
    } catch (err: any) {
      setShared(false);
      toast({ title: 'Share failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleTryAnother = () => {
    setUserPhoto(null);
    setClothingPhoto(null);
    setResultImage(null);
    setDescription(null);
    setCaption('');
    setIsPublic(getDefaultSharePreference());
    setShared(false);
    setAutoSaved(false);
    setProductLink('');
    setClothingSaved(false);
    setSavedToItems(false);
    setAccessoryPhoto(null);
    setAccessoryCategory(null);
    setAddingAccessory(false);
    setLayerHistory([]);
  };

  const handleAddAccessory = async () => {
    if (!resultImage || !accessoryPhoto) return;
    if (!hasUnlimitedTryOns && getMonthlyTryOnCount() >= FREE_MONTHLY_LIMIT) {
      setShowPremiumGate(true);
      return;
    }
    setAddingAccessory(true);
    trackEvent('tryon_accessory_started', { category: accessoryCategory });
    try {
      // Use current result as the "person" photo and accessory as the "clothing"
      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: { userPhoto: resultImage, clothingPhoto: accessoryPhoto },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!hasUnlimitedTryOns) incrementTryOnCount();
      if (data.resultImage) {
        setLayerHistory(prev => [...prev, resultImage!]);
        setResultImage(data.resultImage);
        setAccessoryPhoto(null);
        setAccessoryCategory(null);
        trackEvent('tryon_accessory_generated', { category: accessoryCategory });
        toast({ title: `${accessoryCategory || 'Accessory'} added!`, description: 'Keep adding items or finish your look.' });
        if (user) {
          // Update the saved post with new result
          try {
            const resultUrl = await uploadBase64ToStorage(data.resultImage, 'result');
            const { data: latestPosts } = await supabase.from('tryon_posts').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
            if (latestPosts && latestPosts.length > 0) {
              await supabase.from('tryon_posts').update({ result_photo_url: resultUrl }).eq('id', latestPosts[0].id);
            }
          } catch { /* silent */ }
        }
      } else {
        toast({ title: 'Could not add accessory', description: data?.description || 'Try a clearer photo.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Accessory failed', description: err.message, variant: 'destructive' });
    } finally {
      setAddingAccessory(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-bottom">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg">
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
            {/* Upload zones */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input ref={userPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(setUserPhoto, 'photo')} className="hidden" />
              <input ref={userCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={handleFileSelect(setUserPhoto, 'photo')} className="hidden" />
              <input ref={clothingPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(setClothingPhoto, 'clothing')} className="hidden" />
              <input ref={clothingCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileSelect(setClothingPhoto, 'clothing')} className="hidden" />

              {/* Your Photo */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Your Photo <span className="text-destructive">*</span></p>
                {userPhoto ? (
                  <div className="relative">
                    <button onClick={() => userPhotoRef.current?.click()} className="w-full rounded-xl overflow-hidden border-2 border-primary/40 bg-card active:scale-[0.97] transition-all">
                      <div className="aspect-[3/4]">
                        <img src={userPhoto} alt="You" className="w-full h-full object-cover" />
                      </div>
                    </button>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <p className="text-[9px] text-primary font-medium flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> Ready</p>
                      <button onClick={(e) => { e.stopPropagation(); userPhotoRef.current?.click(); }} className="text-[9px] text-muted-foreground hover:text-foreground transition-colors underline">Change</button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-border bg-card overflow-hidden">
                    <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 p-3">
                      <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-[9px] text-muted-foreground text-center">Full body · front facing · well lit</p>
                      <div className="flex gap-1.5 w-full">
                        <button
                          onClick={() => userCameraRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary active:scale-95 transition-transform"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">Camera</span>
                        </button>
                        <button
                          onClick={() => userPhotoRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-card border border-border text-muted-foreground active:scale-95 transition-transform"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">Gallery</span>
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
                      <div className="aspect-[3/4]">
                        <img src={clothingPhoto} alt="Clothing" className="w-full h-full object-cover" />
                      </div>
                    </button>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <p className="text-[9px] text-primary font-medium flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> Ready</p>
                      <button onClick={(e) => { e.stopPropagation(); clothingPhotoRef.current?.click(); }} className="text-[9px] text-muted-foreground hover:text-foreground transition-colors underline">Change</button>
                      {user && !clothingSaved && (
                        <button onClick={saveClothingToWardrobe} className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                          <Bookmark className="h-2.5 w-2.5" /> Save
                        </button>
                      )}
                      {clothingSaved && (
                        <span className="text-[9px] text-primary/70 flex items-center gap-0.5"><Bookmark className="h-2.5 w-2.5" /> Saved</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-border bg-card overflow-hidden">
                    <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 p-3">
                      <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <Shirt className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-[9px] text-muted-foreground text-center">Product photo · clean background</p>
                      <div className="flex gap-1.5 w-full">
                        <button
                          onClick={() => clothingCameraRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary active:scale-95 transition-transform"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">Camera</span>
                        </button>
                        <button
                          onClick={() => clothingPhotoRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-card border border-border text-muted-foreground active:scale-95 transition-transform"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">Gallery</span>
                        </button>
                      </div>
                      {user && wardrobeItems.length > 0 && (
                        <button
                          onClick={() => setShowWardrobe(!showWardrobe)}
                          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-primary/20 text-primary active:scale-95 transition-transform mt-0.5"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">My Wardrobe ({wardrobeItems.length})</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {/* Wardrobe picker */}
                {showWardrobe && wardrobeItems.length > 0 && (
                  <div className="mt-2 bg-card border border-border rounded-xl p-2 max-h-[200px] overflow-y-auto">
                    <div className="grid grid-cols-3 gap-1.5">
                      {wardrobeItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => selectFromWardrobe(item)}
                          className="rounded-lg overflow-hidden border border-border hover:border-primary/40 active:scale-95 transition-all"
                        >
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
                  setProductLink(e.target.value);
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

            {/* Category selector */}
            <div className="mb-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Category</p>
              <div className="flex gap-1.5 flex-wrap">
                {CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                     className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all active:scale-95 ${
                      category === c.key
                        ? 'border-primary bg-primary text-primary-foreground font-bold'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick picks — powered by product catalog */}
            {!clothingPhoto && (
              <div className="mb-3">
                <p className="section-label mb-1.5">Quick Picks</p>
                <CategoryProductGrid
                  category={category}
                  title={`Shop ${CATEGORIES.find(c => c.key === category)?.label || category}`}
                  collapsed={false}
                  maxItems={8}
                  seed={1234}
                  onSelectProduct={async (product) => {
                    setSelectedQuickPick(product);
                    if (product.product_url) setProductLink(product.product_url);
                    trackEvent('tryon_clothing_uploaded');
                    const base64 = await imageUrlToBase64(product.image_url);
                    setClothingPhoto(base64);
                  }}
                />
              </div>
            )}

            {/* Retailer link for selected Quick Pick */}
            {selectedQuickPick?.product_url && (
              <div className="mb-3 p-3 rounded-xl bg-primary/5 border-2 border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Shop {selectedQuickPick.name}
                  </p>
                  <button
                    onClick={() => setSelectedQuickPick(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <a
                  href={selectedQuickPick.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('quickpick_retailer_clicked', { retailer: selectedQuickPick.retailer, item: selectedQuickPick.name })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-xs font-bold text-primary hover:bg-primary/25 transition-colors active:scale-95"
                >
                  <Store className="h-3.5 w-3.5" />
                  {selectedQuickPick.retailer} — {selectedQuickPick.brand}
                </a>
              </div>
            )}

            {/* Generate CTA */}
            <Button
              className="w-full h-11 rounded-lg text-sm font-bold btn-luxury text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-30"
              onClick={handleTryOn}
              disabled={loading || !canGenerate}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating your preview…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate Try-On</>
              )}
            </Button>

            {!canGenerate && !loading && (
              <p className="text-[10px] text-muted-foreground text-center mt-1.5 mb-1">
                {!userPhoto && !clothingPhoto ? 'Upload your photo and a clothing item to start' :
                 !userPhoto ? 'Upload your photo to continue' : 'Upload a clothing item to continue'}
              </p>
            )}
            {canGenerate && !loading && (
              <p className="text-[10px] text-primary font-medium text-center mt-1.5 mb-1 flex items-center justify-center gap-1">
                <Check className="h-3 w-3" /> Ready to generate
              </p>
            )}

            {/* Expectation note */}
            <div className="flex items-start gap-1.5 bg-card border border-border rounded-lg px-3 py-2 mt-2 mb-3">
              <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                AI preview — actual fit, drape, and texture may vary. Use your Scan profile for the most accurate sizing.
              </p>
            </div>
          </>
        ) : (
          /* ─── RESULT STATE ─── */
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {/* Success banner */}
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 mb-3">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-primary">Try-On ready</p>
                <p className="text-[10px] text-muted-foreground">{autoSaved ? 'Auto-saved to your profile' : 'Sign in to save'}</p>
              </div>
            </div>

            <FullscreenImage src={resultImage} alt="Try-on result">
              <div className="rounded-xl overflow-hidden border border-border mb-3">
                <img src={resultImage} alt="Try-on result" className="w-full" />
              </div>
            </FullscreenImage>

            {/* ── Shop This Size CTA ── */}
            <div className="mb-3">
              {productLink ? (
                <Button
                  className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
                  onClick={() => {
                    trackEvent('shop_clickout', { source: 'tryon', hasLink: true });
                    window.open(productLink, '_blank', 'noopener');
                  }}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" /> Shop This Look
                </Button>
              ) : selectedQuickPick?.product_url ? (
                <Button
                  className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
                  onClick={() => {
                    trackEvent('shop_clickout', { source: 'tryon', retailer: selectedQuickPick.retailer, quickPick: selectedQuickPick.name });
                    window.open(selectedQuickPick.product_url!, '_blank', 'noopener');
                  }}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" /> Shop at {selectedQuickPick.retailer}
                </Button>
              ) : (
                <Button
                  className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
                  onClick={() => {
                    trackEvent('shop_clickout', { source: 'tryon', hasLink: false });
                    window.open('https://www.google.com/search?tbm=shop&q=outfit', '_blank', 'noopener');
                  }}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" /> Shop This Look
                </Button>
              )}
              <p className="text-[8px] text-muted-foreground/50 text-center mt-1">We may earn a commission. It doesn't change your price.</p>
            </div>

            {/* ── Add Accessory Section ── */}
            <div className="mb-3 p-3 rounded-xl border border-border bg-card">
              <input ref={accessoryPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect((v) => setAccessoryPhoto(v), 'clothing')} className="hidden" />
              <input ref={accessoryCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileSelect((v) => setAccessoryPhoto(v), 'clothing')} className="hidden" />

              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Add Accessory
                </p>
                {layerHistory.length > 0 && (
                  <span className="text-[9px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {layerHistory.length} item{layerHistory.length !== 1 ? 's' : ''} layered
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Layer one item at a time — shoes, hat, jewelry, and more</p>

              {/* Category chips */}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {ACCESSORY_CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    onClick={() => {
                      setAccessoryCategory(prev => prev === c.key ? null : c.key);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all active:scale-95 ${
                      accessoryCategory === c.key
                        ? 'border-primary bg-primary text-primary-foreground font-bold'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Accessory photo preview + upload */}
              {accessoryPhoto ? (
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/40 shrink-0">
                    <img src={accessoryPhoto} alt="Accessory" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-[10px] text-primary font-medium flex items-center gap-1"><Check className="h-3 w-3" /> {accessoryCategory || 'Accessory'} ready</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => accessoryPhotoRef.current?.click()} className="text-[9px] text-muted-foreground underline">Change</button>
                      <button onClick={() => { setAccessoryPhoto(null); setAccessoryCategory(null); }} className="text-[9px] text-destructive underline">Remove</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-1.5 mb-2">
                    <button
                      onClick={() => { if (!accessoryCategory) setAccessoryCategory('shoes'); accessoryCameraRef.current?.click(); }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary active:scale-95 transition-transform"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold">Camera</span>
                    </button>
                    <button
                      onClick={() => { if (!accessoryCategory) setAccessoryCategory('shoes'); accessoryPhotoRef.current?.click(); }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-card border border-border text-muted-foreground active:scale-95 transition-transform"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold">Gallery</span>
                    </button>
                  </div>
                  {/* Catalog products for selected accessory category */}
                  {accessoryCategory && (
                    <div className="mb-2">
                      <CategoryProductGrid
                        category={accessoryCategory}
                        title={`Shop ${accessoryCategory}`}
                        collapsed={false}
                        maxItems={4}
                        seed={9999}
                        onSelectProduct={async (product) => {
                          if (product.product_url) setProductLink(product.product_url);
                          trackEvent('catalog_product_clicked', { brand: product.brand, category: accessoryCategory });
                          const base64 = await imageUrlToBase64(product.image_url);
                          setAccessoryPhoto(base64);
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              <Button
                className="w-full h-10 rounded-lg text-[12px] font-bold btn-luxury text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-30"
                onClick={handleAddAccessory}
                disabled={!accessoryPhoto || addingAccessory}
              >
                {addingAccessory ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Adding {accessoryCategory || 'accessory'}…</>
                ) : (
                  <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Add {accessoryCategory || 'Accessory'} to Look</>
                )}
              </Button>
            </div>


            <Button
              className="w-full h-10 rounded-lg bg-accent text-accent-foreground text-sm font-bold mb-2 active:scale-[0.97] transition-transform"
              onClick={() => {
                if (!caption) setCaption(FIT_CHECK_PROMPTS[Math.floor(Math.random() * FIT_CHECK_PROMPTS.length)]);
                setIsPublic(true);
                handleShare();
              }}
              disabled={shared}
            >
              {shared && isPublic ? (
                <><Check className="mr-1.5 h-3.5 w-3.5" /> Posted to Fit Check!</>
              ) : (
                <><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Post to Fit Check</>
              )}
            </Button>

            {/* ── Save to Saved Items ── */}
            {user && !savedToItems && (
              <Button
                variant="outline"
                className="w-full h-9 rounded-lg text-[11px] font-bold mb-2"
                onClick={async () => {
                  try {
                    await supabase.from('saved_items').insert({
                      user_id: user.id,
                      product_link: productLink || null,
                      retailer: selectedQuickPick?.retailer || null,
                      brand: selectedQuickPick?.brand || null,
                      category: category || null,
                      size_recommendation: null,
                      confidence: null,
                      product_image_url: clothingPhoto,
                    });
                    setSavedToItems(true);
                    trackEvent('saved_item_added', { source: 'tryon' });
                    toast({
                      title: '✓ Saved to your items',
                      description: 'View your saved items anytime.',
                      action: (
                        <button
                          onClick={() => navigate('/profile/saved')}
                          className="text-[11px] font-bold text-primary underline"
                        >
                          View Saved Items
                        </button>
                      ),
                    });
                  } catch {
                    toast({ title: 'Could not save', variant: 'destructive' });
                  }
                }}
              >
                <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save for Later
              </Button>
            )}
            {savedToItems && (
              <div className="flex items-center gap-2 justify-center mb-2">
                <Check className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-bold text-primary">Saved</span>
                <button onClick={() => navigate('/profile/saved')} className="text-[10px] text-primary underline font-medium">
                  View Saved Items →
                </button>
              </div>
            )}

            {/* ── Caption / Edit before posting ── */}
            {!shared && (
              <div className="space-y-2 mb-2">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Caption or question</p>
                  <Textarea placeholder="e.g., Should I buy this for work?" value={caption} onChange={e => setCaption(e.target.value)} className="rounded-lg resize-none text-sm" rows={2} />
                  {!caption && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {FIT_CHECK_PROMPTS.map(p => (
                        <button key={p} onClick={() => setCaption(p)} className="text-[9px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Visibility toggle */}
                <div className="flex items-center justify-between bg-card rounded-lg p-2.5 border border-border">
                  <div>
                    <span className="text-[12px] font-semibold text-foreground">Post to Style Check</span>
                    <p className="text-[9px] text-muted-foreground">
                      {isPublic ? 'Visible to the community' : 'Private — only you can see'}
                    </p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={(v) => { setIsPublic(v); saveSharePreference(v); }} />
                </div>

                {/* Manual share button */}
                <Button className="w-full h-10 rounded-lg btn-luxury text-primary-foreground text-sm font-bold" onClick={handleShare}>
                  {isPublic ? <><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Save & Post</> : <><Save className="mr-1.5 h-3.5 w-3.5" /> Save to Profile</>}
                </Button>
              </div>
            )}

            {/* Secondary actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-9 rounded-lg text-[11px]" onClick={handleTryAnother}>
                <RotateCcw className="mr-1 h-3 w-3" /> Try Another
              </Button>
              <Button variant="outline" className="flex-1 h-9 rounded-lg text-[11px]" onClick={() => navigate('/style-check')}>
                <MessageSquare className="mr-1 h-3 w-3" /> View Style Check
              </Button>
            </div>
          </motion.div>
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

      {/* Premium Gate Modal */}
      {showPremiumGate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6"
          onClick={() => setShowPremiumGate(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 text-center relative"
          >
            <button onClick={() => setShowPremiumGate(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">You've used your free try-ons</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to Premium for unlimited try-ons, priority generation, and side-by-side comparison mode.
            </p>
            <Button
              className="w-full h-11 rounded-lg btn-luxury text-primary-foreground font-bold mb-2"
              onClick={() => { setShowPremiumGate(false); navigate('/premium'); }}
            >
              <Crown className="mr-2 h-4 w-4" /> Upgrade to Premium
            </Button>
            <button onClick={() => setShowPremiumGate(false)} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}

      <BottomTabBar />
    </div>
  );
};

export default TryOn;
