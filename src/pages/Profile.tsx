import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Shirt, Crown, Trash2, Shield, Download, Settings, Ruler } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getFitPreference, setFitPreference } from '@/lib/session';
import type { FitPreference, BodyScanResult } from '@/lib/types';
import { SUPPORTED_RETAILERS } from '@/lib/types';
import BottomTabBar from '@/components/BottomTabBar';
import { useToast } from '@/hooks/use-toast';

interface TryOnPost {
  id: string;
  result_photo_url: string;
  caption: string | null;
  is_public: boolean;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [tryOnPosts, setTryOnPosts] = useState<TryOnPost[]>([]);
  const [activeTab, setActiveTab] = useState<'tryons' | 'settings'>('tryons');
  const [loading, setLoading] = useState(true);
  const [useCm, setUseCm] = useState(true);
  const [fit, setFit] = useState<FitPreference>(getFitPreference());
  const [savedProfile, setSavedProfile] = useState<BodyScanResult | null>(null);

  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return; }
    fetchProfile();
    loadSavedProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const [profileRes, postsRes] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('user_id', user.id).single(),
      supabase.from('tryon_posts').select('id, result_photo_url, caption, is_public, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (profileRes.data) setDisplayName(profileRes.data.display_name || user.email?.split('@')[0] || 'User');
    if (postsRes.data) setTryOnPosts(postsRes.data);
    setLoading(false);
  };

  const loadSavedProfile = () => {
    try { const scans = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]'); if (scans.length > 0) setSavedProfile(scans[0]); } catch { /* ignore */ }
  };

  const handleFitChange = (newFit: FitPreference) => { setFit(newFit); setFitPreference(newFit); toast({ title: 'Updated', description: `Default fit: ${newFit}.` }); };
  const handleDeletePhotos = () => { localStorage.removeItem('dripcheck_scans'); setSavedProfile(null); toast({ title: 'Deleted', description: 'Scan data removed.' }); };
  const handleDeleteAccount = () => { toast({ title: 'Contact support', description: 'Account deletion requires contacting support.' }); };
  const handleExport = () => {
    const scans = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    const blob = new Blob([JSON.stringify(scans, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dripfit-data.json'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported' });
  };
  const handleSignOut = async () => { await signOut(); navigate('/', { replace: true }); };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-20">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl gradient-drip flex items-center justify-center">
              <Crown className="h-5 w-5 text-primary-foreground" />
            </div>
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
              {loading ? (
                <div className="text-center py-10 text-muted-foreground text-[13px]">Loading…</div>
              ) : tryOnPosts.length === 0 ? (
                <div className="text-center py-10">
                  <Shirt className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[13px] font-semibold text-muted-foreground mb-3">No try-ons yet</p>
                  <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5" onClick={() => navigate('/tryon')}>Generate Try-On</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {tryOnPosts.map(post => (
                    <motion.div key={post.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                      <div className="rounded-xl overflow-hidden border border-border bg-card">
                        <img src={post.result_photo_url} alt="Try-on" className="w-full aspect-[3/4] object-cover" />
                        <div className="p-2">
                          <p className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                          <span className={`text-[10px] font-bold ${post.is_public ? 'text-primary' : 'text-muted-foreground/40'}`}>
                            {post.is_public ? 'Public' : 'Private'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="settings" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-3">
              {/* Units */}
              <Card className="rounded-xl">
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-foreground">Default unit</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
                    <Switch checked={!useCm} onCheckedChange={v => setUseCm(!v)} className="scale-[0.8]" />
                    <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>in</span>
                  </div>
                </CardContent>
              </Card>

              {/* Fit */}
              <Card className="rounded-xl">
                <CardContent className="p-3">
                  <p className="text-[13px] font-bold text-foreground mb-2">Default Fit</p>
                  <div className="flex gap-1.5">
                    {(['fitted', 'regular', 'relaxed'] as FitPreference[]).map(f => (
                      <button key={f} onClick={() => handleFitChange(f)} className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all capitalize ${fit === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Body profile */}
              <Card className="rounded-xl">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Ruler className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[13px] font-bold text-foreground">Body Profile</p>
                  </div>
                  {savedProfile ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        {[
                          { l: 'Size', v: savedProfile.recommendedSize, cls: 'text-primary' },
                          { l: 'Confidence', v: savedProfile.confidence, cls: 'text-foreground capitalize' },
                          { l: 'Height', v: `${savedProfile.heightCm} cm`, cls: 'text-foreground' },
                        ].map(d => (
                          <div key={d.l}>
                            <p className="text-[10px] text-muted-foreground">{d.l}</p>
                            <p className={`text-[13px] font-bold ${d.cls}`}>{d.v}</p>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full rounded-lg text-[11px] h-8" onClick={() => navigate('/capture')}>Re-scan</Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[13px] text-muted-foreground mb-2">No saved scan.</p>
                      <Button variant="outline" size="sm" className="rounded-lg text-[11px] h-8" onClick={() => navigate('/capture')}>Start Scan</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Retailers */}
              <Card className="rounded-xl">
                <CardContent className="p-3">
                  <p className="text-[13px] font-bold text-foreground mb-2">Supported Retailers</p>
                  <div className="flex flex-wrap gap-1">
                    {SUPPORTED_RETAILERS.map(r => (
                      <span key={r} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">{r}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Privacy */}
              <Card className="rounded-xl">
                <CardContent className="p-3 space-y-2">
                  <p className="text-[13px] font-bold text-foreground">Privacy & Data</p>
                  <Button variant="outline" className="w-full rounded-lg justify-start h-9 text-[12px]" onClick={handleExport}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export my data
                  </Button>
                  <Button variant="outline" className="w-full rounded-lg justify-start h-9 text-[12px] text-destructive/70 hover:text-destructive" onClick={handleDeletePhotos}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete photos & scans
                  </Button>
                  <Button variant="outline" className="w-full rounded-lg justify-start h-9 text-[12px] text-destructive/70 hover:text-destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete account
                  </Button>
                </CardContent>
              </Card>

              <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" /> Private · delete anytime
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
