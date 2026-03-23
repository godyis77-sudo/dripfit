import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shirt, MessageSquare, Instagram, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFollow, getFollowCounts } from '@/hooks/useFollow';
import BottomTabBar from '@/components/BottomTabBar';

interface PublicProfileData {
  display_name: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
  user_id: string;
}

interface PublicTryOn {
  id: string;
  result_photo_url: string;
  caption: string | null;
  created_at: string;
}

const PublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle(username ? `@${username}` : 'Profile');

  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [tryOns, setTryOns] = useState<PublicTryOn[]>([]);
  const [fitCheckCount, setFitCheckCount] = useState(0);
  const [voteCount, setVoteCount] = useState(0);
  const [scanInfo, setScanInfo] = useState<{ size: string; fit: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'tryons' | 'fitchecks'>('tryons');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const { isFollowing, loading: followLoading, toggle: toggleFollow } = useFollow(profile?.user_id || null);

  useEffect(() => {
    if (!username) return;
    fetchPublicProfile();
  }, [username]);

  const fetchPublicProfile = async () => {
    setLoading(true);
    // Find profile by display_name using security definer function
    const { data: profileRows, error } = await supabase.rpc('get_public_profile_by_name', { p_display_name: username! });

    const profileData = (profileRows as any)?.[0] ?? null;

    if (error || !profileData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // If viewing own profile, redirect
    if (user && profileData.user_id === user.id) {
      navigate('/profile', { replace: true });
      return;
    }

    setProfile(profileData);

    // Fetch public try-ons, post count, vote count, and scan info in parallel
    const [tryOnsRes, ratingsRes, scanRes] = await Promise.all([
      supabase
        .from('tryon_posts')
        .select('id, result_photo_url, caption, created_at')
        .eq('user_id', profileData.user_id)
        .eq('is_public', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('tryon_ratings')
        .select('id', { count: 'exact', head: true })
        .in('post_id', (await supabase.from('tryon_posts').select('id').eq('user_id', profileData.user_id).eq('is_public', true)).data?.map(p => p.id) || []),
      supabase
        .from('body_scans')
        .select('recommended_size')
        .eq('user_id', profileData.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const posts = tryOnsRes.data || [];
    setTryOns(posts);
    setFitCheckCount(posts.length);
    setVoteCount(ratingsRes.count || 0);

    if (scanRes.data?.recommended_size) {
      setScanInfo({ size: scanRes.data.recommended_size, fit: 'Regular' });
    }

    // Fetch follow counts
    getFollowCounts(profileData.user_id).then(counts => {
      setFollowerCount(counts.followers);
      setFollowingCount(counts.following);
    });

    setLoading(false);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-safe-tab">
        <p className="text-base font-bold text-foreground mb-1">Profile not found</p>
        <p className="text-[12px] text-muted-foreground mb-4">This user doesn't exist or their profile is private.</p>
        <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>Go Back</Button>
        <BottomTabBar />
      </div>
    );
  }

  const displayName = profile?.display_name || username || 'User';

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <p className="text-[13px] font-bold text-foreground">Profile</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-16 w-16 rounded-full skeleton-gold" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded skeleton-gold" />
                <div className="h-3 w-20 rounded skeleton-gold" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-lg skeleton-gold" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Profile header */}
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary/30 bg-card shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full gradient-drip flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-foreground">{displayName[0]?.toUpperCase()}</span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">{displayName}</h1>
                <p className="text-[12px] text-muted-foreground">@{(displayName).toLowerCase().replace(/\s+/g, '')}</p>
                {profile?.instagram_handle && (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 mt-0.5 text-[10px] text-primary font-medium active:opacity-70 transition-opacity"
                  >
                    <Instagram className="h-3 w-3" /> @{profile.instagram_handle}
                  </a>
                )}
                {scanInfo && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                      SIZE: {scanInfo.size}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/30 border border-border px-2 py-0.5 rounded-md">
                      FIT: {scanInfo.fit}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Follow button */}
            {user && profile && user.id !== profile.user_id && (
              <Button
                variant={isFollowing ? 'outline' : 'default'}
                className={`w-full rounded-xl h-9 text-[12px] font-bold mb-4 ${!isFollowing ? 'btn-luxury text-primary-foreground' : ''}`}
                onClick={toggleFollow}
                disabled={followLoading}
              >
                {isFollowing ? <><UserCheck className="mr-1 h-3.5 w-3.5" /> Following</> : <><UserPlus className="mr-1 h-3.5 w-3.5" /> Follow</>}
              </Button>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {[
                { label: 'Followers', value: followerCount + (isFollowing ? 1 : 0) },
                { label: 'Following', value: followingCount },
                { label: 'Style Checks', value: fitCheckCount },
                { label: 'Votes', value: voteCount },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-lg py-2 text-center">
                  <p className="text-[14px] font-bold text-foreground">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 bg-card rounded-lg p-0.5 mb-4 border border-border/40">
              {[
                { key: 'tryons' as const, icon: Shirt, label: 'Try-Ons' },
                { key: 'fitchecks' as const, icon: MessageSquare, label: 'Style Checks' },
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

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'tryons' ? (
                <motion.div key="tryons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {tryOns.length === 0 ? (
                    <div className="text-center py-10">
                      <Shirt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-[13px] text-muted-foreground">No public try-ons yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 pb-20">
                      {tryOns.map(post => (
                        <button
                          key={post.id}
                          onClick={() => navigate('/style-check')}
                          className="relative rounded-lg overflow-hidden aspect-[3/4] bg-card border border-border active:scale-95 transition-transform"
                        >
                          <img src={post.result_photo_url} alt={post.caption || ''} className="w-full h-full object-cover img-normalize" />
                          {post.caption && (
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-1.5 px-2">
                              <p className="text-[10px] text-white font-medium line-clamp-1">{post.caption}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="fitchecks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {tryOns.length === 0 ? (
                    <div className="text-center py-10">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-[13px] text-muted-foreground">No style checks yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pb-20">
                      {tryOns.map(post => (
                        <button
                          key={post.id}
                          onClick={() => navigate('/style-check')}
                          className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-2.5 active:scale-[0.98] transition-transform text-left"
                        >
                          <img src={post.result_photo_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0 img-normalize" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-foreground line-clamp-1">{post.caption || 'Style Check'}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default PublicProfile;
