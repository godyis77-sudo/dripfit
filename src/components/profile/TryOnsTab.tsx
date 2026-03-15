import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { navigateToTryOn } from '@/lib/tryonNavigate';
import TryOnDetailSheet from './TryOnDetailSheet';
import WhatsInThisLook from '@/components/community/WhatsInThisLook';
import { getPostedCaption } from '@/components/community/community-types';

interface TryOnPost {
  id: string;
  result_photo_url: string;
  caption: string | null;
  is_public: boolean;
  created_at: string;
  product_urls?: string[] | null;
  clothing_photo_url?: string;
}

const VOTE_OPTIONS = [
  { key: 'love', label: 'Love it', emoji: '❤️' },
  { key: 'buy', label: 'Buy it', emoji: '🔥' },
  { key: 'keep_shopping', label: 'Keep shopping', emoji: '🛒' },
] as const;

interface TryOnsTabProps {
  tryOnPosts: TryOnPost[];
  loading: boolean;
  onPostUpdated?: () => void;
}

type FilterMode = 'all' | 'public' | 'private';

const TryOnsTab = ({ tryOnPosts, loading, onPostUpdated }: TryOnsTabProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const publicCount = tryOnPosts.filter(p => p.is_public).length;
  const [selectedPost, setSelectedPost] = useState<TryOnPost | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [votes, setVotes] = useState<Record<string, string[]>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  // Load vote counts for public posts
  useEffect(() => {
    const publicPosts = tryOnPosts.filter(p => p.is_public);
    if (publicPosts.length === 0) return;
    const postIds = publicPosts.map(p => p.id);
    (async () => {
      const { data } = await supabase.from('community_votes').select('post_id, vote_key, user_id').in('post_id', postIds);
      if (!data) return;
      const counts: Record<string, Record<string, number>> = {};
      const userVotes: Record<string, string[]> = {};
      data.forEach(v => {
        if (!counts[v.post_id]) counts[v.post_id] = { love: 0, buy: 0, keep_shopping: 0 };
        counts[v.post_id][v.vote_key] = (counts[v.post_id][v.vote_key] || 0) + 1;
        if (user && v.user_id === user.id) {
          if (!userVotes[v.post_id]) userVotes[v.post_id] = [];
          userVotes[v.post_id].push(v.vote_key);
        }
      });
      setVoteCounts(counts);
      setVotes(userVotes);
    })();
  }, [tryOnPosts, user]);

  const handleVote = async (postId: string, key: string) => {
    if (!user) { toast({ title: 'Sign in to vote', variant: 'destructive' }); return; }
    const currentVotes = votes[postId] || [];
    const hasKey = currentVotes.includes(key);
    let newVotes: string[];
    if (key === 'keep_shopping') {
      if (hasKey) { newVotes = []; } else {
        newVotes = ['keep_shopping'];
        for (const k of currentVotes) {
          if (k !== 'keep_shopping') await supabase.from('community_votes').delete().eq('post_id', postId).eq('user_id', user.id).eq('vote_key', k);
        }
      }
    } else {
      if (hasKey) { newVotes = currentVotes.filter(v => v !== key); } else {
        newVotes = [...currentVotes.filter(v => v !== 'keep_shopping'), key];
        if (currentVotes.includes('keep_shopping')) await supabase.from('community_votes').delete().eq('post_id', postId).eq('user_id', user.id).eq('vote_key', 'keep_shopping');
      }
    }
    setVotes(prev => ({ ...prev, [postId]: newVotes }));
    setVoteCounts(prev => {
      const pc = { ...(prev[postId] || { love: 0, buy: 0, keep_shopping: 0 }) };
      for (const k of currentVotes) { if (!newVotes.includes(k)) pc[k] = Math.max(0, (pc[k] || 0) - 1); }
      for (const k of newVotes) { if (!currentVotes.includes(k)) pc[k] = (pc[k] || 0) + 1; }
      return { ...prev, [postId]: pc };
    });
    if (hasKey) { await supabase.from('community_votes').delete().eq('post_id', postId).eq('user_id', user.id).eq('vote_key', key); }
    else { await supabase.from('community_votes').insert({ post_id: postId, user_id: user.id, vote_key: key }); }
    trackEvent('vote_cast', { vote: key, source: 'profile_tryons' });
  };

  const handleUpdateCaption = async (postId: string, val: string) => {
    if (!user) { toast({ title: 'Sign in first', variant: 'destructive' }); return; }
    const { error } = await supabase
      .from('tryon_posts')
      .update({ caption: val })
      .eq('id', postId)
      .eq('user_id', user.id);
    if (error) {
      toast({ title: 'Failed to save caption', variant: 'destructive' });
      return;
    }
    trackEvent('fitcheck_caption_updated', { postId });
    toast({ title: 'Caption saved!' });
    onPostUpdated?.();
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = (postId: string) => {
    cancelLongPress();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setConfirmDeleteId(postId);
    }, 500);
  };

  const handleDeleteTryOn = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('tryon_posts').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    trackEvent('fitcheck_post_deleted', { postId: id, source: 'profile_tryons' });
    toast({ title: 'Deleted', description: 'Try-on removed permanently.' });
    setSelectedPost(null);
    onPostUpdated?.();
  };

  useEffect(() => () => cancelLongPress(), []);

  return (
    <>
      {/* Filter stats row */}
      <div className="flex gap-1.5 mb-4">
        {([
          { key: 'all' as FilterMode, label: 'Total', value: tryOnPosts.length },
          { key: 'public' as FilterMode, label: 'Public', value: publicCount },
          { key: 'private' as FilterMode, label: 'Private', value: tryOnPosts.length - publicCount },
        ]).map(s => (
          <button
            key={s.key}
            onClick={() => setFilterMode(s.key)}
            className={`rounded-lg px-3 py-0.5 text-center transition-all active:scale-95 border ${
              filterMode === s.key
                ? 'btn-gold-3d border-transparent'
                : 'bg-card border-border'
            }`}
          >
            <p className={`text-[11px] font-bold ${filterMode === s.key ? 'text-primary-foreground' : 'text-foreground'}`}>{s.value}</p>
            <p className={`text-[9px] uppercase tracking-wider ${filterMode === s.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{s.label}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <div className="aspect-[3/4]" style={{ background: 'linear-gradient(110deg, #1A1A1A 30%, #272727 50%, #1A1A1A 70%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
              <div className="p-2 space-y-1">
                <div className="h-2 rounded w-2/3" style={{ background: 'linear-gradient(110deg, #1A1A1A 30%, #272727 50%, #1A1A1A 70%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                <div className="h-2 rounded w-1/3" style={{ background: 'linear-gradient(110deg, #1A1A1A 30%, #272727 50%, #1A1A1A 70%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
              </div>
            </div>
          ))}
        </div>
      ) : tryOnPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="h-12 w-12 rounded-2xl badge-gold-3d shimmer-sweep flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-[18px] font-bold text-foreground mb-1">No try-ons yet</h2>
          <p className="text-[14px] text-muted-foreground max-w-[260px] mb-5">See any outfit on your body before you buy.</p>
          <Button className="rounded-full btn-luxury text-primary-foreground text-sm h-11 px-6 font-bold" onClick={() => navigate('/tryon')}>
            Start Your First Try-On
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {tryOnPosts
              .filter(p => filterMode === 'all' ? true : filterMode === 'public' ? p.is_public : !p.is_public)
              .map(post => {
                const postedCaption = getPostedCaption(post.caption);

                return (
                  <motion.div key={post.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="w-full rounded-xl overflow-hidden border border-border bg-card text-left">
                      <button
                        onClick={() => setSelectedPost(post)}
                        className="w-full active:scale-[0.97] transition-transform"
                      >
                        <div className="relative">
                          <img src={post.result_photo_url} alt="Try-on" className="w-full aspect-[3/4] object-cover" />
                          {postedCaption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
                              <p className="text-[10px] font-bold text-white text-center line-clamp-2 drop-shadow-sm">{postedCaption}</p>
                            </div>
                          )}
                        </div>
                      </button>


                      {/* What's In This Look */}
                      <WhatsInThisLook
                        productUrls={post.product_urls || undefined}
                        clothingPhotoUrl={post.clothing_photo_url}
                        variant="card"
                        onTryOn={(item) => navigateToTryOn(navigate, { productUrl: item.url, fallbackClothingImageUrl: item.image_url || post.clothing_photo_url, source: 'profile_tryons' })}
                        onAddToWardrobe={async (item) => {
                          if (!user) return;
                          const imgUrl = item.image_url || post.clothing_photo_url || '';
                          await supabase.from('clothing_wardrobe').insert({ user_id: user.id, image_url: imgUrl, category: 'top', brand: item.brand !== 'Shop' ? item.brand : null, product_link: item.url || null });
                          toast({ title: 'Added', description: 'Saved to your wardrobe.' });
                          trackEvent('wardrobe_add_from_look', { brand: item.brand });
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 h-9 rounded-lg text-[11px]" onClick={() => navigate('/tryon')}>
              <Sparkles className="mr-1 h-3 w-3" /> New Try-On
            </Button>
            <Button variant="outline" className="flex-1 h-9 rounded-lg text-[11px]" onClick={() => navigate('/style-check')}>
              <MessageSquare className="mr-1 h-3 w-3" /> Style Check Feed
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Delete try-on?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              This will permanently remove it from your try-ons.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-[12px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl text-[12px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDeleteId) return;
                void handleDeleteTryOn(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TryOnDetailSheet
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => { if (!open) setSelectedPost(null); }}
        onPostUpdated={() => { setSelectedPost(null); onPostUpdated?.(); }}
        onDelete={handleDeleteTryOn}
      />
    </>
  );
};

export default TryOnsTab;
