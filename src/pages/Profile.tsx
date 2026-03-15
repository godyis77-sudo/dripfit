import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Shirt, Camera, Settings, ShoppingBag, ShoppingCart, User, Globe, X } from 'lucide-react';
import InlineCrown from '@/components/ui/InlineCrown';
import { useAuth } from '@/hooks/useAuth';
import PremiumBadge from '@/components/monetization/PremiumBadge';
import { supabase } from '@/integrations/supabase/client';
import { getFitPreference, setFitPreference, getPremiumBannerDismissed, dismissPremiumBanner } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import type { FitPreference } from '@/lib/types';
import BottomTabBar from '@/components/BottomTabBar';
import { useToast } from '@/hooks/use-toast';
import TryOnsTab from '@/components/profile/TryOnsTab';
import BodyTab from '@/components/profile/BodyTab';
import WardrobeTab from '@/components/profile/WardrobeTab';
import CartTab from '@/components/profile/CartTab';
import AvatarUploadSheet from '@/components/profile/AvatarUploadSheet';
import { useProfileInfo, useTryOnPosts, useLatestScan, useWardrobe, useFavoriteRetailers } from '@/hooks/useProfileData';
import { useQueryClient } from '@tanstack/react-query';

const Profile = () => {
  const navigate = useNavigate();
  usePageTitle('Profile');
  const { user, signOut, isSubscribed } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profileData } = useProfileInfo(user?.id);
  const { data: tryOnPosts = [], isLoading: postsLoading } = useTryOnPosts(user?.id);
  const { data: scanData } = useLatestScan(user?.id);
  const { data: wardrobeItems = [] } = useWardrobe(user?.id);
  const { data: favoriteRetailers = [] } = useFavoriteRetailers(user?.id);

  const [activeTab, setActiveTab] = useState<'tryons' | 'wardrobe' | 'cart'>('tryons');
  const [fit, setFit] = useState<FitPreference>(getFitPreference());
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(getPremiumBannerDismissed());

  const displayName = profileData?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profileData?.avatar_url ?? null;
  const scanConfidence = profileData?.scan_confidence ?? null;
  const savedProfile = scanData?.profile ?? null;

  // No manual redirect needed — ProtectedRoute handles unauthenticated users
  if (!user) return null;

  const deleteWardrobeItem = async (id: string) => {
    const { error } = await supabase.from('clothing_wardrobe').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Error', description: 'Could not remove item. Try again.', variant: 'destructive' });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['wardrobe', user.id] });
    toast({ title: 'Removed', description: 'Item removed from wardrobe.' });
  };

  const handleFitChange = (newFit: FitPreference) => { setFit(newFit); setFitPreference(newFit); toast({ title: 'Updated', description: `Default fit set to ${newFit}.` }); };
  const handleDeletePhotos = async () => {
    const { error } = await supabase.from('body_scans').delete().eq('user_id', user.id);
    if (error) {
      console.error('Failed to delete scans:', error);
      toast({ title: 'Error', description: 'Could not delete scan data.' });
      return;
    }
    localStorage.removeItem('dripcheck_scans');
    queryClient.invalidateQueries({ queryKey: ['latest-scan', user.id] });
    toast({ title: 'Deleted', description: 'All scan data has been permanently removed.' });
  };
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.');
    if (!confirmed) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      trackEvent('account_deleted');
      await signOut();
      navigate('/', { replace: true });
      toast({ title: 'Account deleted', description: 'Your account and all data have been permanently removed.' });
    } catch (e: unknown) {
      console.error('Account deletion failed:', e);
      toast({ title: 'Error', description: 'Could not delete account. Please try again.', variant: 'destructive' });
    }
  };
  const handleExport = async () => {
    try {
      // Fetch all scans from DB for this user
      const { data: dbScans } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      const exportData = dbScans || [];
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'dripfit-data.json'; a.click();
      URL.revokeObjectURL(url);
      trackEvent('profile_export');
      toast({ title: 'Data exported' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };
  const handleAvatarUploaded = (url: string) => {
    queryClient.invalidateQueries({ queryKey: ['profile-info', user.id] });
  };
  const handleDisplayNameSave = async (name: string) => {
    const { error } = await supabase.rpc('update_own_profile', { p_display_name: name });
    if (error) { toast({ title: 'Error', description: 'Could not update display name.', variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['profile-info', user.id] });
    toast({ title: 'Display name updated!' });
  };
  const handleInstagramSave = async (handle: string) => {
    const { error } = await supabase.rpc('update_own_profile', { p_instagram_handle: handle });
    if (error) { toast({ title: 'Error', description: 'Could not update Instagram handle.', variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['profile-info', user.id] });
    toast({ title: handle ? 'Instagram linked!' : 'Instagram removed' });
  };
  const handleSignOut = async () => { await signOut(); navigate('/', { replace: true }); };

  const refetchProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['tryon-posts', user.id] });
    queryClient.invalidateQueries({ queryKey: ['profile-info', user.id] });
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        {/* Premium banner / status bar */}
        {isSubscribed ? (
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-xl btn-gold-3d mb-3">
            <InlineCrown size={16} />
            <span className="text-[11px] font-bold text-primary-foreground flex-1 text-left">DRIPFIT ✔ PREMIUM</span>
            <PremiumBadge label="Active" />
          </div>
        ) : !bannerDismissed ? (
          <div className="relative w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 mb-3">
            <button
              onClick={() => { trackEvent('premium_viewed', { source: 'profile_banner' }); navigate('/premium'); }}
              className="flex items-center gap-2 flex-1 active:scale-[0.98] transition-transform"
            >
              <InlineCrown size={16} />
              <span className="text-[11px] font-bold text-foreground flex-1 text-left">Go Premium</span>
              <span className="text-[11px] text-primary font-bold">7-day free trial →</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); dismissPremiumBanner(); setBannerDismissed(true); }}
              aria-label="Dismiss banner"
              className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors shrink-0"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : null}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAvatarSheet(true)} aria-label="Change profile photo" className="relative group">
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
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary/80 flex items-center justify-center border-2 border-background">
                  <InlineCrown size={10} />
                </div>
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <Camera className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
            </button>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-tight">{displayName}</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] text-muted-foreground">{user.email}</p>
                <button onClick={handleSignOut} className="text-muted-foreground/60 hover:text-destructive transition-colors p-0.5" aria-label="Sign out">
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
              <button
                onClick={() => navigate(`/profile/${encodeURIComponent(displayName)}`)}
                className="flex items-center gap-1 mt-0.5 active:opacity-70 transition-opacity"
              >
                <Globe className="h-2.5 w-2.5 text-primary" />
                <span className="text-[10px] text-primary font-medium">View Public Profile</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/profile/body')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-gold-3d active:scale-95 transition-transform shadow-sm"
            >
              <User className="h-3.5 w-3.5 text-primary-foreground" />
              <span className="text-[11px] text-primary-foreground font-bold">Body</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile/settings')}
              className="text-muted-foreground h-8 w-8 min-h-[44px] min-w-[44px] rounded-lg"
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-card/60 backdrop-blur-sm rounded-xl p-1 mb-4 border border-border/30">
          {[
            { key: 'tryons' as const, icon: Shirt, label: 'Try-Ons' },
            { key: 'wardrobe' as const, icon: ShoppingBag, label: 'Wardrobe' },
            { key: 'cart' as const, icon: ShoppingCart, label: 'Cart' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`relative flex-1 min-h-[44px] rounded-lg text-[11px] font-bold transition-all duration-200 ${
                activeTab === t.key
                  ? 'btn-gold-3d text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'tryons' ? (
            <motion.div key="tryons" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <TryOnsTab tryOnPosts={tryOnPosts} loading={postsLoading} onPostUpdated={refetchProfile} />
            </motion.div>
          ) : activeTab === 'wardrobe' ? (
            <motion.div key="wardrobe" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <WardrobeTab wardrobeItems={wardrobeItems} onDeleteItem={deleteWardrobeItem} favoriteRetailers={favoriteRetailers} />
            </motion.div>
          ) : (
            <motion.div key="cart" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <CartTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomTabBar />
      <AvatarUploadSheet
        open={showAvatarSheet}
        onOpenChange={setShowAvatarSheet}
        userId={user.id}
        onUploaded={handleAvatarUploaded}
      />
    </div>
  );
};

export default Profile;
