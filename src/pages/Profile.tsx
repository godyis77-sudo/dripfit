import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Ruler, Shirt, Crown, Trash2, Shield, Download, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getFitPreference, setFitPreference } from '@/lib/session';
import type { FitPreference } from '@/lib/types';
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

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    fetchProfile();
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

  const handleFitChange = (newFit: FitPreference) => {
    setFit(newFit);
    setFitPreference(newFit);
    toast({ title: 'Updated', description: `Default fit set to ${newFit}.` });
  };

  const handleDeleteAccount = () => {
    toast({ title: 'Contact support', description: 'Account deletion requires contacting support.' });
  };

  const handleExport = () => {
    const scans = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    const blob = new Blob([JSON.stringify(scans, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dripcheck-data.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Your data has been downloaded.' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background px-5 pt-6 pb-24">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl gradient-drip flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{displayName}</h1>
              <p className="text-xs text-foreground/50">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-foreground/50">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-card rounded-2xl p-1 mb-6 border border-border/30">
          <button
            onClick={() => setActiveTab('tryons')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'tryons' ? 'bg-primary text-primary-foreground' : 'text-foreground/50'}`}
          >
            <Shirt className="inline h-4 w-4 mr-1.5 -mt-0.5" /> Try-Ons
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-primary text-primary-foreground' : 'text-foreground/50'}`}
          >
            <Settings className="inline h-4 w-4 mr-1.5 -mt-0.5" /> Settings
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'tryons' ? (
            <motion.div key="tryons" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              {loading ? (
                <div className="text-center py-12 text-foreground/40">Loading…</div>
              ) : tryOnPosts.length === 0 ? (
                <div className="text-center py-12">
                  <Shirt className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground/60 mb-4">No try-ons yet</p>
                  <Button className="rounded-2xl" onClick={() => navigate('/tryon')}>
                    Generate Try-On
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {tryOnPosts.map(post => (
                    <motion.div key={post.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <Card className="rounded-2xl overflow-hidden">
                        <img src={post.result_photo_url} alt="Try-on" className="w-full aspect-[3/4] object-cover" />
                        <CardContent className="p-2.5">
                          <p className="text-[10px] font-medium text-foreground/50">
                            {new Date(post.created_at).toLocaleDateString()}
                          </p>
                          <span className={`text-[10px] font-bold ${post.is_public ? 'text-primary' : 'text-foreground/30'}`}>
                            {post.is_public ? 'Public' : 'Private'}
                          </span>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="settings" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
              {/* Units */}
              <Card className="rounded-2xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Default unit</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
                    <Switch checked={!useCm} onCheckedChange={v => setUseCm(!v)} />
                    <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>in</span>
                  </div>
                </CardContent>
              </Card>

              {/* Fit preference */}
              <Card className="rounded-2xl">
                <CardContent className="p-4">
                  <p className="text-sm font-bold text-foreground mb-3">Default Fit Preference</p>
                  <div className="flex gap-2">
                    {(['fitted', 'regular', 'relaxed'] as FitPreference[]).map(f => (
                      <button
                        key={f}
                        onClick={() => handleFitChange(f)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                          fit === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground/60'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Privacy */}
              <Card className="rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-bold text-foreground">Privacy</p>
                  <Button variant="outline" className="w-full rounded-xl justify-start" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export my data
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl justify-start text-destructive/60 hover:text-destructive" onClick={handleDeleteAccount}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete account & data
                  </Button>
                </CardContent>
              </Card>

              <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" /> Private by default • delete anytime
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
