import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Shirt, Crown, Camera, Settings, ShoppingBag, User, Globe, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PremiumBadge from '@/components/monetization/PremiumBadge';
import { supabase } from '@/integrations/supabase/client';
import { getFitPreference, setFitPreference, getPremiumBannerDismissed, dismissPremiumBanner } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import type { FitPreference, BodyScanResult } from '@/lib/types';
import BottomTabBar from '@/components/BottomTabBar';
import { useToast } from '@/hooks/use-toast';
import TryOnsTab from '@/components/profile/TryOnsTab';
import BodyTab from '@/components/profile/BodyTab';
import WardrobeTab from '@/components/profile/WardrobeTab';
import SettingsTab from '@/components/profile/SettingsTab';
import AvatarUploadSheet from '@/components/profile/AvatarUploadSheet';

interface TryOnPost {
  id: string;
  result_photo_url: string;
  caption: string | null;
  is_public: boolean;
  created_at: string;
}

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  product_link: string | null;
  retailer: string | null;
  brand: string | null;
  notes: string | null;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  usePageTitle('Profile');
  const { user, signOut, isSubscribed, subscriptionEnd, productId } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tryOnPosts, setTryOnPosts] = useState<TryOnPost[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [favoriteRetailers, setFavoriteRetailers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'tryons' | 'body' | 'wardrobe'>('tryons');
  const [loading, setLoading] = useState(true);
  const [useCm, setUseCm] = useState(true);
  const [fit, setFit] = useState<FitPreference>(getFitPreference());
  const [savedProfile, setSavedProfile] = useState<BodyScanResult | null>(null);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);
  const [savedItemCount, setSavedItemCount] = useState(0);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(getPremiumBannerDismissed());

  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return; }
    let stale = false;

    const run = async () => {
      await Promise.all([
        fetchProfile().then(() => { if (stale) return; }),
        loadSavedProfile(),
        fetchSavedItemCount(),
        fetchWardrobe(),
        fetchFavoriteRetailers(),
      ]);
    };
    run();

    return () => { stale = true; };
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const [profileRes, postsRes] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_url, scan_confidence').eq('user_id', user.id).single(),
      supabase.from('tryon_posts').select('id, result_photo_url, clothing_photo_url, caption, is_public, created_at, product_url').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (profileRes.data) {
      setDisplayName(profileRes.data.display_name || user.email?.split('@')[0] || 'User');
      setAvatarUrl(profileRes.data.avatar_url);
      setScanConfidence((profileRes.data as any).scan_confidence ?? null);
      setInstagramHandle((profileRes.data as any).instagram_handle || '');
    }
    if (postsRes.data) setTryOnPosts(postsRes.data);
    setLoading(false);
  };

  const loadSavedProfile = async () => {
    if (!user) {
      try { const scans = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]'); if (scans.length > 0) setSavedProfile(scans[0]); } catch { /* ignore */ }
      return;
    }
    try {
      const { data, error } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) { console.error('Failed to load scan:', error); return; }
      if (data) {
        const profile: BodyScanResult = {
          id: data.id,
          date: data.created_at,
          shoulder: { min: data.shoulder_min, max: data.shoulder_max },
          chest: { min: data.chest_min, max: data.chest_max },
          bust: (data as any).bust_min != null && (data as any).bust_max != null && ((data as any).bust_min > 0 || (data as any).bust_max > 0)
            ? { min: (data as any).bust_min, max: (data as any).bust_max } : undefined,
          waist: { min: data.waist_min, max: data.waist_max },
          hips: { min: data.hip_min, max: data.hip_max },
          inseam: { min: data.inseam_min, max: data.inseam_max },
          sleeve: (data as any).sleeve_min != null && (data as any).sleeve_max != null && ((data as any).sleeve_min > 0 || (data as any).sleeve_max > 0)
            ? { min: (data as any).sleeve_min, max: (data as any).sleeve_max } : undefined,
          heightCm: data.height_cm,
          confidence: (data.confidence as any) || 'medium',
          recommendedSize: data.recommended_size || 'M',
          fitPreference: 'regular',
          alternatives: { sizeDown: '', sizeUp: '' },
          whyLine: '',
        };
        setSavedProfile(profile);
      }
    } catch (e) {
      console.error('Error loading scan profile:', e);
    }
  };

  const fetchSavedItemCount = async () => {
    if (!user) return;
    const { count } = await supabase.from('saved_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    setSavedItemCount(count || 0);
  };

  const fetchWardrobe = async () => {
    if (!user) return;
    const { data } = await supabase.from('clothing_wardrobe').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setWardrobeItems(data);
  };

  const fetchFavoriteRetailers = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_favorite_retailers').select('retailer_name').eq('user_id', user.id);
    if (data) setFavoriteRetailers(data.map(r => r.retailer_name));
  };

  const deleteWardrobeItem = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('clothing_wardrobe').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Error', description: 'Could not remove item. Try again.', variant: 'destructive' });
      return;
    }
    setWardrobeItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Removed', description: 'Item removed from wardrobe.' });
  };

  const handleFitChange = (newFit: FitPreference) => { setFit(newFit); setFitPreference(newFit); toast({ title: 'Updated', description: `Default fit set to ${newFit}.` }); };
  const handleDeletePhotos = async () => {
    if (!user) return;
    const { error } = await supabase.from('body_scans').delete().eq('user_id', user.id);
    if (error) {
      console.error('Failed to delete scans:', error);
      toast({ title: 'Error', description: 'Could not delete scan data.' });
      return;
    }
    localStorage.removeItem('dripcheck_scans');
    setSavedProfile(null);
    toast({ title: 'Deleted', description: 'All scan data has been permanently removed.' });
  };
  const handleDeleteAccount = () => { toast({ title: 'Contact support', description: 'Account deletion requires contacting support.' }); };
  const handleExport = () => {
    const scans = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    const blob = new Blob([JSON.stringify(scans, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dripfit-data.json'; a.click();
    URL.revokeObjectURL(url);
    trackEvent('profile_export');
    toast({ title: 'Data exported' });
  };
  const handleAvatarUploaded = (url: string) => { setAvatarUrl(url); };
  const handleDisplayNameSave = async (name: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ display_name: name }).eq('user_id', user.id);
    if (error) { toast({ title: 'Error', description: 'Could not update display name.', variant: 'destructive' }); return; }
    setDisplayName(name);
    toast({ title: 'Display name updated!' });
  };
  const handleInstagramSave = async (handle: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ instagram_handle: handle } as any).eq('user_id', user.id);
    if (error) { toast({ title: 'Error', description: 'Could not update Instagram handle.', variant: 'destructive' }); return; }
    setInstagramHandle(handle);
    toast({ title: handle ? 'Instagram linked!' : 'Instagram removed' });
  };
  const handleSignOut = async () => { await signOut(); navigate('/', { replace: true }); };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-bottom">
      <div className="max-w-sm mx-auto">
        {/* Premium banner / status bar */}
        {isSubscribed ? (
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[hsl(42,80%,30%)] to-[hsl(42,70%,20%)] border border-primary/30 mb-3">
            <Crown className="h-4 w-4 text-primary shrink-0" />
            <span className="text-[11px] font-bold text-foreground flex-1 text-left">DRIPFITCHECK PREMIUM</span>
            <PremiumBadge label="Active" />
          </div>
        ) : !bannerDismissed ? (
          <div className="relative w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 mb-3">
            <button
              onClick={() => { trackEvent('premium_viewed', { source: 'profile_banner' }); navigate('/premium'); }}
              className="flex items-center gap-2 flex-1 active:scale-[0.98] transition-transform"
            >
              <Crown className="h-4 w-4 text-primary shrink-0" />
              <span className="text-[11px] font-bold text-foreground flex-1 text-left">Go Premium</span>
              <span className="text-[9px] text-primary font-bold">7-day free trial →</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); dismissPremiumBanner(); setBannerDismissed(true); }}
              className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : null}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAvatarSheet(true)} className="relative group">
              <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-primary/30 bg-card">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full gradient-drip flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">{displayName[0]?.toUpperCase() || 'U'}</span>
                  </div>
                )}
              </div>
              {isSubscribed ? (
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-[hsl(42,80%,30%)] flex items-center justify-center border-2 border-background">
                  <Crown className="h-2.5 w-2.5 text-primary" />
                </div>
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <Camera className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
            </button>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-tight">{displayName}</h1>
              <p className="text-[11px] text-muted-foreground">{user.email}</p>
              <button
                onClick={() => navigate(`/profile/${encodeURIComponent(displayName)}`)}
                className="flex items-center gap-1 mt-0.5 active:opacity-70 transition-opacity"
              >
                <Globe className="h-2.5 w-2.5 text-primary" />
                <span className="text-[10px] text-primary font-medium">View Public Profile</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile/settings')}
              className="text-muted-foreground h-8 w-8 rounded-lg"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground h-8 w-8 rounded-lg">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab switcher — 3 tabs, Settings moved to gear icon */}
        <div className="flex gap-0.5 bg-card rounded-lg p-0.5 mb-4 border border-border/40">
          {[
            { key: 'tryons' as const, icon: Shirt, label: 'Try-Ons' },
            { key: 'body' as const, icon: User, label: 'Body' },
            { key: 'wardrobe' as const, icon: ShoppingBag, label: 'Wardrobe' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 rounded-md text-[12px] font-bold transition-all ${activeTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              <t.icon className="inline h-3.5 w-3.5 mr-1 -mt-0.5" /> {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'tryons' ? (
            <motion.div key="tryons" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <TryOnsTab tryOnPosts={tryOnPosts} loading={loading} onPostUpdated={fetchProfile} />
            </motion.div>
          ) : activeTab === 'body' ? (
            <motion.div key="body" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <BodyTab savedProfile={savedProfile} fit={fit} scanConfidence={scanConfidence} />
            </motion.div>
          ) : (
            <motion.div key="wardrobe" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <WardrobeTab wardrobeItems={wardrobeItems} onDeleteItem={deleteWardrobeItem} favoriteRetailers={favoriteRetailers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomTabBar />
      {user && (
        <AvatarUploadSheet
          open={showAvatarSheet}
          onOpenChange={setShowAvatarSheet}
          userId={user.id}
          onUploaded={handleAvatarUploaded}
        />
      )}
    </div>
  );
};

export default Profile;
