import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Ruler, Shirt, Crown, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getMeasurements, deleteMeasurement } from '@/lib/storage';
import { MeasurementResult, MEASUREMENT_LABELS } from '@/lib/types';
import BottomTabBar from '@/components/BottomTabBar';

interface TryOnPost {
  id: string;
  result_photo_url: string;
  clothing_photo_url: string;
  caption: string | null;
  is_public: boolean;
  created_at: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');
  const [tryOnPosts, setTryOnPosts] = useState<TryOnPost[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementResult[]>([]);
  const [activeTab, setActiveTab] = useState<'tryons' | 'measurements'>('tryons');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    fetchProfile();
    setMeasurements(getMeasurements());
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const [profileRes, postsRes] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('user_id', user.id).single(),
      supabase.from('tryon_posts').select('id, result_photo_url, clothing_photo_url, caption, is_public, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (profileRes.data) setDisplayName(profileRes.data.display_name || user.email?.split('@')[0] || 'User');
    if (postsRes.data) setTryOnPosts(postsRes.data);
    setLoading(false);
  };

  const handleDeleteMeasurement = (id: string) => {
    deleteMeasurement(id);
    setMeasurements(prev => prev.filter(m => m.id !== id));
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{tryOnPosts.length}</p>
              <p className="text-xs font-semibold text-foreground/60">Try-Ons</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{measurements.length}</p>
              <p className="text-xs font-semibold text-foreground/60">Measurements</p>
            </CardContent>
          </Card>
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
            onClick={() => setActiveTab('measurements')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'measurements' ? 'bg-primary text-primary-foreground' : 'text-foreground/50'}`}
          >
            <Ruler className="inline h-4 w-4 mr-1.5 -mt-0.5" /> Measurements
          </button>
        </div>

        {/* Content */}
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
                    Try On Something
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
                          {post.caption && <p className="text-xs font-medium text-foreground/80 mt-0.5 truncate">{post.caption}</p>}
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
            <motion.div key="measurements" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              {measurements.length === 0 ? (
                <div className="text-center py-12">
                  <Ruler className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground/60 mb-4">No measurements yet</p>
                  <Button className="rounded-2xl" onClick={() => navigate('/capture')}>
                    Start Measuring
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {measurements.map(m => (
                    <Card
                      key={m.id}
                      className="rounded-2xl cursor-pointer"
                      onClick={() => navigate('/results', { state: { result: m } })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-foreground">
                            {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold">
                              {m.sizeRecommendation}
                            </span>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-foreground/30"
                              onClick={e => { e.stopPropagation(); handleDeleteMeasurement(m.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {(['chest', 'waist', 'hips', 'inseam'] as const).map(key => (
                            <div key={key} className="text-center">
                              <p className="text-[10px] font-semibold text-foreground/50">{MEASUREMENT_LABELS[key]}</p>
                              <p className="text-sm font-bold text-foreground">{m[key]}"</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-end mt-2 text-foreground/30">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Profile;
