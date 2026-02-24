import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Shirt, Crown, Camera, Settings, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getFitPreference, setFitPreference } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import type { FitPreference, BodyScanResult } from '@/lib/types';
import BottomTabBar from '@/components/BottomTabBar';
import { useToast } from '@/hooks/use-toast';
import TryOnsTab from '@/components/profile/TryOnsTab';
import BodyTab from '@/components/profile/BodyTab';
import WardrobeTab from '@/components/profile/WardrobeTab';
import SettingsTab from '@/components/profile/SettingsTab';

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
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tryOnPosts, setTryOnPosts] = useState<TryOnPost[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [activeTab, setActiveTab] = useState<'tryons' | 'body' | 'wardrobe' | 'settings'>('tryons');
  const [loading, setLoading] = useState(true);
  const [useCm, setUseCm] = useState(true);
  const [fit, setFit] = useState<FitPreference>(getFitPreference());
  const [savedProfile, setSavedProfile] = useState<BodyScanResult | null>(null);
  const [savedItemCount, setSavedItemCount] = useState(0);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return; }
    fetchProfile();
    loadSavedProfile();
    fetchSavedItemCount();
    fetchWardrobe();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const [profileRes, postsRes] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_url').eq('user_id', user.id).single(),
      supabase.from('tryon_posts').select('id, result_photo_url, caption, is_public, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (profileRes.data) {
      setDisplayName(profileRes.data.display_name || user.email?.split('@')[0] || 'User');
      setAvatarUrl(profileRes.data.avatar_url);
    }
    if (postsRes.data) setTryOnPosts(postsRes.data);
    setLoading(false);
  };

  const loadSavedProfile = () => {
    try { const scans = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]'); if (scans.length > 0) setSavedProfile(scans[0]); } catch { /* ignore */ }
  };

  const fetchSavedItemCount = async () => {
    if (!user) return;
    const { count } = await supabase.from('saved_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    setSavedItemCount(count || 0);
  };

  const fetchWardrobe = async () => {
    if (!user) return;
    const { data } = await supabase.from('clothing_wardrobe' as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setWardrobeItems(data as any as WardrobeItem[]);
  };

  const deleteWardrobeItem = async (id: string) => {
    await supabase.from('clothing_wardrobe' as any).delete().eq('id', id);
    setWardrobeItems(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Removed', description: 'Item removed from wardrobe.' });
  };

  const handleFitChange = (newFit: FitPreference) => { setFit(newFit); setFitPreference(newFit); toast({ title: 'Updated', description: `Default fit set to ${newFit}.` }); };
  const handleDeletePhotos = () => { localStorage.removeItem('dripcheck_scans'); setSavedProfile(null); toast({ title: 'Deleted', description: 'Scan data removed.' }); };
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
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('tryon-images').upload(fileName, file, { contentType: file.type, upsert: true });
    if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); return; }
    const { data: urlData } = supabase.storage.from('tryon-images').getPublicUrl(fileName);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
    setAvatarUrl(publicUrl);
    toast({ title: 'Avatar updated' });
  };
  const handleSignOut = async () => { await signOut(); navigate('/', { replace: true }); };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-bottom">
      <div className="max-w-sm mx-auto">
        {/* Go Premium banner */}
        <button
          onClick={() => { trackEvent('premium_viewed', { source: 'profile_banner' }); navigate('/premium'); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 mb-3 active:scale-[0.98] transition-transform"
        >
          <Crown className="h-4 w-4 text-primary shrink-0" />
          <span className="text-[11px] font-bold text-foreground flex-1 text-left">Go Premium</span>
          <span className="text-[9px] text-primary font-bold">7-day free trial →</span>
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <button onClick={() => avatarInputRef.current?.click()} className="relative group">
              <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-primary/30 bg-card">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full gradient-drip flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-foreground">{displayName[0]?.toUpperCase() || 'U'}</span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                <Camera className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            </button>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-tight">{displayName}</h1>
              <p className="text-[11px] text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground h-8 w-8 rounded-lg">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-0.5 bg-card rounded-lg p-0.5 mb-4 border border-border/40">
          {[
            { key: 'tryons' as const, icon: Shirt, label: 'Try-Ons' },
            { key: 'body' as const, icon: User, label: 'Body' },
            { key: 'wardrobe' as const, icon: ShoppingBag, label: 'Wardrobe' },
            { key: 'settings' as const, icon: Settings, label: 'Settings' },
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
              <TryOnsTab tryOnPosts={tryOnPosts} loading={loading} />
            </motion.div>
          ) : activeTab === 'body' ? (
            <motion.div key="body" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <BodyTab savedProfile={savedProfile} fit={fit} />
            </motion.div>
          ) : activeTab === 'wardrobe' ? (
            <motion.div key="wardrobe" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <WardrobeTab wardrobeItems={wardrobeItems} onDeleteItem={deleteWardrobeItem} />
            </motion.div>
          ) : (
            <motion.div key="settings" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <SettingsTab
                user={user}
                displayName={displayName}
                savedProfile={savedProfile}
                fit={fit}
                useCm={useCm}
                savedItemCount={savedItemCount}
                onFitChange={handleFitChange}
                onUnitToggle={(v) => setUseCm(!v)}
                onExport={handleExport}
                onDeletePhotos={handleDeletePhotos}
                onDeleteAccount={handleDeleteAccount}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Profile;
