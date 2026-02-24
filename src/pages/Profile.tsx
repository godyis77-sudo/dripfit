import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Shirt, Crown, Trash2, Shield, Download, Settings, Ruler, Camera, ChevronRight, Sparkles, MessageSquare, Bookmark, ShoppingBag, User, Check, ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getFitPreference, setFitPreference } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import type { FitPreference, BodyScanResult } from '@/lib/types';
import { SUPPORTED_RETAILERS, MEASUREMENT_LABELS } from '@/lib/types';
import BottomTabBar from '@/components/BottomTabBar';
import BodyDiagram from '@/components/results/BodyDiagram';
import { useToast } from '@/hooks/use-toast';

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

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <p className="section-label mb-2 mt-4 first:mt-0">{children}</p>
);

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

  const loadSavedProfile = async () => {
    if (!user) return;
    // Try database first
    const { data } = await supabase
      .from('body_scans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setSavedProfile({
        id: data.id,
        date: data.created_at,
        shoulder: { min: data.shoulder_min, max: data.shoulder_max },
        chest: { min: data.chest_min, max: data.chest_max },
        waist: { min: data.waist_min, max: data.waist_max },
        hips: { min: data.hip_min, max: data.hip_max },
        inseam: { min: data.inseam_min, max: data.inseam_max },
        heightCm: data.height_cm,
        confidence: data.confidence as any,
        recommendedSize: data.recommended_size || 'M',
        fitPreference: 'regular',
        alternatives: { sizeDown: '', sizeUp: '' },
        whyLine: '',
      });
      return;
    }
    // Fallback to localStorage
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

  const publicCount = tryOnPosts.filter(p => p.is_public).length;

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
              {/* Stats row */}
              <div className="flex gap-2 mb-4">
                {[
                  { label: 'Total', value: tryOnPosts.length },
                  { label: 'Public', value: publicCount },
                  { label: 'Private', value: tryOnPosts.length - publicCount },
                ].map(s => (
                  <div key={s.label} className="flex-1 bg-card border border-border rounded-lg py-2 text-center">
                    <p className="text-[16px] font-bold text-foreground">{s.value}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rounded-xl border border-border bg-card animate-pulse">
                      <div className="aspect-[3/4] bg-muted rounded-t-xl" />
                      <div className="p-2 space-y-1"><div className="h-2 bg-muted rounded w-2/3" /><div className="h-2 bg-muted rounded w-1/3" /></div>
                    </div>
                  ))}
                </div>
              ) : tryOnPosts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-6 w-6 text-primary/50" />
                  </div>
                  <p className="text-[14px] font-bold text-foreground mb-1">No Try-Ons yet</p>
                  <p className="text-[12px] text-muted-foreground max-w-[200px] mx-auto mb-4">Upload a photo and a clothing item to see how it looks on you.</p>
                  <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/tryon')}>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Create Your First Try-On
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {tryOnPosts.map(post => (
                      <motion.div key={post.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="rounded-xl overflow-hidden border border-border bg-card">
                          <img src={post.result_photo_url} alt="Try-on" className="w-full aspect-[3/4] object-cover" />
                          <div className="p-2 flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${post.is_public ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {post.is_public ? 'Public' : 'Private'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Re-entry CTAs */}
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" className="flex-1 h-9 rounded-lg text-[11px]" onClick={() => navigate('/tryon')}>
                      <Sparkles className="mr-1 h-3 w-3" /> New Try-On
                    </Button>
                    <Button variant="outline" className="flex-1 h-9 rounded-lg text-[11px]" onClick={() => navigate('/community')}>
                      <MessageSquare className="mr-1 h-3 w-3" /> Fit Check Feed
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          ) : activeTab === 'body' ? (
            <motion.div key="body" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              {savedProfile ? (
                <>
                  {/* Body Diagram */}
                  {(() => {
                    const m: Record<string, { min: number; max: number }> = {};
                    if (savedProfile.shoulder) m.shoulder = savedProfile.shoulder;
                    if (savedProfile.chest) m.chest = savedProfile.chest;
                    if (savedProfile.bust) m.bust = savedProfile.bust;
                    if (savedProfile.waist) m.waist = savedProfile.waist;
                    if (savedProfile.hips) m.hips = savedProfile.hips;
                    if (savedProfile.inseam) m.inseam = savedProfile.inseam;
                    if (savedProfile.sleeve) m.sleeve = savedProfile.sleeve;
                    return <BodyDiagram measurements={m} heightCm={savedProfile.heightCm} />;
                  })()}

                  {/* Summary card */}
                  <div className="bg-card border border-border rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="h-3.5 w-3.5 text-primary" />
                      <p className="text-[13px] font-bold text-foreground">Fit Identity</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Size', value: savedProfile.recommendedSize },
                        { label: 'Fit', value: fit, cls: 'capitalize' },
                        { label: 'Confidence', value: savedProfile.confidence, cls: 'capitalize' },
                        { label: 'Height', value: `${savedProfile.heightCm}cm` },
                      ].map(d => (
                        <div key={d.label} className="bg-background rounded-lg py-1.5 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                          <p className={`text-[12px] font-bold text-foreground ${d.cls || ''}`}>{d.value}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2">Last scan: {new Date(savedProfile.date).toLocaleDateString()}</p>
                  </div>

                  <Button variant="outline" className="w-full rounded-lg text-[11px] h-9 mb-2" onClick={() => navigate('/capture')}>
                    <Camera className="mr-1.5 h-3.5 w-3.5" /> Update Body Scan
                  </Button>
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Ruler className="h-6 w-6 text-primary/50" />
                  </div>
                  <p className="text-[14px] font-bold text-foreground mb-1">No body scan yet</p>
                  <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">Complete a quick scan to see your measurements and body diagram here.</p>
                  <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/capture')}>
                    <Camera className="mr-1.5 h-4 w-4" /> Start Scan
                  </Button>
                </div>
              )}
            </motion.div>
          ) : activeTab === 'wardrobe' ? (
            <motion.div key="wardrobe" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <p className="text-[11px] text-muted-foreground mb-3">Your saved clothing and potential buys.</p>
              {wardrobeItems.length === 0 ? (
                <div className="text-center py-8">
                  {/* Stylized empty wardrobe illustration */}
                  <div className="relative mx-auto w-32 h-36 mb-4">
                    <div className="absolute inset-x-2 top-0 h-1.5 rounded-full bg-muted" />
                    <div className="absolute left-4 top-1.5 w-0.5 h-8 bg-muted" />
                    <div className="absolute right-4 top-1.5 w-0.5 h-8 bg-muted" />
                    <div className="absolute inset-x-0 top-10 bottom-0 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1">
                      <Shirt className="h-8 w-8 text-muted-foreground/20" />
                      <div className="flex gap-1">
                        <div className="w-1.5 h-6 rounded-full bg-primary/10" />
                        <div className="w-1.5 h-8 rounded-full bg-primary/15" />
                        <div className="w-1.5 h-5 rounded-full bg-primary/10" />
                        <div className="w-1.5 h-7 rounded-full bg-primary/12" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[15px] font-bold text-foreground mb-1">Your dream closet starts here</p>
                  <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">Save clothing from Try-On sessions to build your personal wardrobe.</p>
                  <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/tryon')}>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Start Try-On
                  </Button>
                </div>
              ) : (
                <div className="columns-2 gap-2 space-y-2">
                  {wardrobeItems.map(item => (
                    <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="break-inside-avoid">
                      <div className="rounded-xl overflow-hidden border border-border bg-card">
                        <img src={item.image_url} alt="Clothing" className="w-full object-cover" />
                        <div className="p-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground capitalize">{item.category}</span>
                            {item.retailer && <span className="text-[9px] text-primary font-bold uppercase">{item.retailer}</span>}
                          </div>
                          <p className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                          <div className="flex gap-1">
                            {item.product_link && (
                              <button
                                onClick={() => { trackEvent('shop_clickout', { source: 'wardrobe' }); window.open(item.product_link!, '_blank', 'noopener'); }}
                                className="flex-1 text-[9px] font-bold py-1 rounded-md bg-primary/10 text-primary active:scale-95 transition-transform"
                              >
                                Shop
                              </button>
                            )}
                            <button
                              onClick={() => deleteWardrobeItem(item.id)}
                              className="text-[9px] text-muted-foreground py-1 px-2 rounded-md border border-border active:scale-95 transition-transform"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="settings" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>

              {/* ── Fit Identity Card — conditional ── */}
              {savedProfile ? (
                <div className="bg-card border border-border rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="h-7 w-7 rounded-lg gradient-drip flex items-center justify-center">
                      <Ruler className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <p className="text-[13px] font-bold text-foreground">Fit Identity</p>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Fit', value: fit, cls: 'capitalize' },
                      { label: 'Size', value: savedProfile.recommendedSize },
                      { label: 'Unit', value: useCm ? 'cm' : 'in' },
                      { label: 'Confidence', value: savedProfile.confidence, cls: 'capitalize' },
                    ].map(d => (
                      <div key={d.label} className="bg-background rounded-lg py-1.5 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                        <p className={`text-[12px] font-bold text-foreground ${d.cls || ''}`}>{d.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    Last scan: {new Date(savedProfile.date).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-4 mb-4 text-center">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Ruler className="h-5 w-5 text-primary/50" />
                  </div>
                  <p className="text-[13px] font-bold text-foreground mb-0.5">No fit profile yet</p>
                  <p className="text-[10px] text-muted-foreground mb-3 max-w-[220px] mx-auto">
                    Complete a quick Scan to get accurate size recommendations across all retailers.
                  </p>
                  <Button className="rounded-lg btn-luxury text-primary-foreground text-[11px] h-9 px-4 font-bold" onClick={() => navigate('/capture')}>
                    <Camera className="mr-1.5 h-3.5 w-3.5" /> Start Scan
                  </Button>
                </div>
              )}

              {/* ── Account ── */}
              <SectionHeader>Account</SectionHeader>
              <div className="bg-card border border-border rounded-xl divide-y divide-border mb-1">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-[12px] text-foreground">Email</span>
                  <span className="text-[11px] text-muted-foreground">{user.email}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-[12px] text-foreground">Display name</span>
                  <span className="text-[11px] text-muted-foreground">{displayName}</span>
                </div>
              </div>

              {/* ── Fit Preferences ── */}
              <SectionHeader>Fit Preferences</SectionHeader>
              <div className="bg-card border border-border rounded-xl divide-y divide-border mb-1">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-[12px] text-foreground font-medium">Default unit</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
                    <Switch checked={!useCm} onCheckedChange={v => setUseCm(!v)} className="scale-[0.75]" />
                    <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>in</span>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[12px] text-foreground font-medium mb-1.5">Default fit</p>
                  <div className="flex gap-1.5">
                    {(['fitted', 'regular', 'relaxed'] as FitPreference[]).map(f => (
                      <button key={f} onClick={() => handleFitChange(f)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all capitalize active:scale-95 ${fit === f ? 'gradient-drip text-primary-foreground' : 'bg-background border border-border text-muted-foreground'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Saved Items with count ── */}
              <SectionHeader>Saved Items</SectionHeader>
              <div className="bg-card border border-border rounded-xl mb-1">
                <button
                  onClick={() => navigate('/saved')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-muted/50 transition-colors"
                >
                  <Bookmark className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[12px] text-foreground font-medium">View Saved for Later</span>
                  {savedItemCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{savedItemCount}</span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </button>
              </div>

              {/* ── Saved Body Profile ── */}
              {savedProfile && (
                <>
                  <SectionHeader>Body Profile</SectionHeader>
                  <div className="bg-card border border-border rounded-xl p-3 mb-1">
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { l: 'Size', v: savedProfile.recommendedSize },
                          { l: 'Confidence', v: savedProfile.confidence },
                          { l: 'Height', v: `${savedProfile.heightCm} cm` },
                        ].map(d => (
                          <div key={d.l} className="bg-background rounded-lg py-1.5 text-center">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{d.l}</p>
                            <p className="text-[12px] font-bold text-foreground capitalize">{d.v}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => navigate('/capture')}
                        className="w-full flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 group active:scale-[0.98] transition-transform"
                      >
                        <span className="text-[11px] text-muted-foreground">Update body scan</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── Premium ── */}
              <SectionHeader>Premium</SectionHeader>
              <div className="bg-card border border-primary/20 rounded-xl mb-1">
                <button
                  onClick={() => { trackEvent('premium_viewed'); navigate('/premium'); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-primary/5 transition-colors"
                >
                  <Crown className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[12px] text-foreground font-medium">Upgrade to Premium</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </button>
              </div>

              {/* ── Retailers ── */}
              <SectionHeader>Supported Retailers</SectionHeader>
              <div className="bg-card border border-border rounded-xl p-3 mb-1">
                <div className="flex flex-wrap gap-1">
                  {SUPPORTED_RETAILERS.map(r => (
                    <span key={r} className="px-2 py-0.5 rounded-md bg-background border border-border text-[10px] font-semibold text-muted-foreground">{r}</span>
                  ))}
                </div>
              </div>

              {/* ── Privacy & Data ── */}
              <SectionHeader>Privacy & Data</SectionHeader>
              <div className="bg-card border border-border rounded-xl divide-y divide-border mb-2">
                <button onClick={handleExport} className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-muted/50 transition-colors">
                  <Download className="h-3.5 w-3.5 text-foreground/60" />
                  <span className="text-[12px] text-foreground">Export my data</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                </button>
              </div>

              {/* Destructive */}
              <div className="bg-card border border-destructive/10 rounded-xl divide-y divide-border mt-2 mb-3">
                <button onClick={handleDeletePhotos} className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-destructive/5 transition-colors">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">Delete photos & scans</span>
                </button>
                <button onClick={handleDeleteAccount} className="w-full flex items-center gap-2 px-3 py-2.5 active:bg-destructive/5 transition-colors">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">Delete account</span>
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1 pb-2">
                <Shield className="h-3 w-3" /> Private by default · delete anytime
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Profile;
