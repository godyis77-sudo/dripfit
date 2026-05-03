import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getFitPreference, setFitPreference, getUseCm, setUseCm as persistUseCm } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import type { FitPreference, BodyScanResult } from '@/lib/types';
import SettingsTab from '@/components/profile/SettingsTab';
import AvatarUploadSheet from '@/components/profile/AvatarUploadSheet';
import BottomTabBar from '@/components/BottomTabBar';

const ProfileSettings = () => {
  const navigate = useNavigate();
  usePageMeta({ title: 'Settings' });
  const { user, isSubscribed, subscriptionEnd, productId, updateGender } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [favoriteRetailers, setFavoriteRetailers] = useState<string[]>([]);
  const [useCm, setUseCmState] = useState(getUseCm());
  const [fit, setFit] = useState<FitPreference>(getFitPreference());
  const [savedProfile, setSavedProfile] = useState<BodyScanResult | null>(null);
  const [savedItemCount, setSavedItemCount] = useState(0);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);
  const [instagramHandle, setInstagramHandle] = useState('');

  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return; }
    let stale = false;
    const run = async () => {
      await fetchData();
      if (stale) return;
    };
    run();
    return () => { stale = true; };
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    const [profileRes, countRes, retailersRes] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_url').eq('user_id', user.id).single(),
      supabase.from('saved_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_favorite_retailers').select('retailer_name').eq('user_id', user.id),
    ]);
    if (profileRes.data) {
      setDisplayName(profileRes.data.display_name || user.email?.split('@')[0] || 'User');
      setAvatarUrl(profileRes.data.avatar_url);
      setInstagramHandle((profileRes.data as any).instagram_handle || '');
    }
    setSavedItemCount(countRes.count || 0);
    if (retailersRes.data) setFavoriteRetailers(retailersRes.data.map(r => r.retailer_name));

    // Load scan
    const { data } = await supabase.from('body_scans').select('id, created_at, height_cm, shoulder_min, shoulder_max, chest_min, chest_max, bust_min, bust_max, waist_min, waist_max, hip_min, hip_max, inseam_min, inseam_max, sleeve_min, sleeve_max, confidence, recommended_size').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) {
      setSavedProfile({
        id: data.id, date: data.created_at,
        shoulder: { min: data.shoulder_min, max: data.shoulder_max },
        chest: { min: data.chest_min, max: data.chest_max },
        bust: (data as any).bust_min > 0 ? { min: (data as any).bust_min, max: (data as any).bust_max } : undefined,
        waist: { min: data.waist_min, max: data.waist_max },
        hips: { min: data.hip_min, max: data.hip_max },
        inseam: { min: data.inseam_min, max: data.inseam_max },
        sleeve: (data as any).sleeve_min > 0 ? { min: (data as any).sleeve_min, max: (data as any).sleeve_max } : undefined,
        heightCm: data.height_cm, confidence: (data.confidence as any) || 'medium',
        recommendedSize: data.recommended_size || 'M', fitPreference: 'regular',
        alternatives: { sizeDown: '', sizeUp: '' }, whyLine: '',
      });
    }
  };

  const handleFitChange = (newFit: FitPreference) => { setFit(newFit); setFitPreference(newFit); toast({ title: 'Updated', description: `Default fit set to ${newFit}.` }); };
  const handleDeletePhotos = async () => {
    if (!user) return;
    await supabase.from('body_scans').delete().eq('user_id', user.id);
    localStorage.removeItem('dripcheck_scans');
    setSavedProfile(null);
    toast({ title: 'Deleted', description: 'All scan data has been permanently removed.' });
  };
  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      const { data: resp, error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      localStorage.clear();
      toast({ title: 'Account deleted', description: 'Your account and all data have been permanently removed.' });
      navigate('/home');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to delete account. Please try again.', variant: 'destructive' });
    }
  };
  const handleExport = () => {
    const scans = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    const blob = new Blob([JSON.stringify(scans, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'dripfit-data.json'; a.click(); URL.revokeObjectURL(url);
    trackEvent('profile_export'); toast({ title: 'Data exported' });
  };
  const handleDisplayNameSave = async (name: string) => {
    if (!user) return;
    const { error } = await supabase.rpc('update_own_profile', { p_display_name: name });
    if (error) { toast({ title: 'Error', description: 'Could not update display name.', variant: 'destructive' }); return; }
    setDisplayName(name); toast({ title: 'Display name updated!' });
  };
  const handleInstagramSave = async (handle: string) => {
    if (!user) return;
    const { error } = await supabase.rpc('update_own_profile', { p_instagram_handle: handle });
    if (error) { toast({ title: 'Error', description: 'Could not update Instagram handle.', variant: 'destructive' }); return; }
    setInstagramHandle(handle); toast({ title: handle ? 'Instagram linked!' : 'Instagram removed' });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px] text-muted-foreground" aria-label="Go back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-[15px] font-bold text-foreground uppercase">Settings</h1>
        </div>
        <SettingsTab
          user={user}
          displayName={displayName}
          avatarUrl={avatarUrl}
          savedProfile={savedProfile}
          fit={fit}
          useCm={useCm}
          savedItemCount={savedItemCount}
          isSubscribed={isSubscribed}
          subscriptionEnd={subscriptionEnd}
          productId={productId}
          favoriteRetailers={favoriteRetailers}
          instagramHandle={instagramHandle}
          onFavoriteRetailersChange={setFavoriteRetailers}
          onFitChange={handleFitChange}
          onUnitToggle={(isInches) => { const newCm = !isInches; setUseCmState(newCm); persistUseCm(newCm); }}
          onExport={handleExport}
          onDeletePhotos={handleDeletePhotos}
          onDeleteAccount={handleDeleteAccount}
          onAvatarTap={() => setShowAvatarSheet(true)}
          onDisplayNameSave={handleDisplayNameSave}
           onInstagramSave={handleInstagramSave}
           onGenderChange={(g) => updateGender(g)}
         />
      </div>
      <BottomTabBar />
      {user && (
        <AvatarUploadSheet open={showAvatarSheet} onOpenChange={setShowAvatarSheet} userId={user.id} onUploaded={(url) => setAvatarUrl(url)} />
      )}
    </div>
  );
};

export default ProfileSettings;
