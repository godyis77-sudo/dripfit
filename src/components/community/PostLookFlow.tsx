import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Check, Globe, Lock, Loader2, Sparkles, ImageIcon, Link2, ChevronDown, ChevronUp, Store, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { detectRetailer } from '@/lib/retailerDetect';

interface TryOnPost {
  id: string;
  result_photo_url: string;
  clothing_photo_url: string;
  caption: string | null;
  is_public: boolean;
  created_at: string;
}

const PROMPT_SUGGESTIONS = [
  'Should I buy this for work?',
  'Date night — yes or no?',
  'Would you wear this?',
  'Too bold or just right?',
  'Casual Friday vibes?',
  'Wedding guest — yay or nay?',
];

interface PostLookFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted: () => void;
}

const PostLookFlow = ({ open, onOpenChange, onPosted }: PostLookFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [posts, setPosts] = useState<TryOnPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<TryOnPost | null>(null);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(true); // defaults to ON/Public
  const [submitting, setSubmitting] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [linkExpanded, setLinkExpanded] = useState(false);
  const [igPostUrl, setIgPostUrl] = useState('');
  const [igExpanded, setIgExpanded] = useState(false);
  const [clothingCategory, setClothingCategory] = useState('other');

  const detectedRetailer = productUrl.length > 10 ? detectRetailer(productUrl) : null;

  useEffect(() => {
    if (open && user) {
      setStep(0);
      setSelectedPost(null);
      setCaption('');
      setIsPublic(true);
      setProductUrl('');
      setLinkExpanded(false);
      setIgPostUrl('');
      setIgExpanded(false);
      setClothingCategory('other');
      fetchUserTryOns();
    }
  }, [open, user]);

  const fetchUserTryOns = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('tryon_posts')
      .select('id, result_photo_url, clothing_photo_url, caption, is_public, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setPosts((data as TryOnPost[]) || []);
    setLoading(false);
  };

  const handlePost = async () => {
    if (!selectedPost || !user) return;
    setSubmitting(true);
    const updatePayload: Record<string, any> = {
      caption: caption || null,
      is_public: isPublic,
      clothing_category: clothingCategory,
    };
    if (productUrl.length > 5) {
      updatePayload.product_urls = [productUrl];
    }
    const { error } = await supabase
      .from('tryon_posts')
      .update(updatePayload)
      .eq('id', selectedPost.id);
    if (error) {
      toast({ title: 'Post failed', description: error.message, variant: 'destructive' });
    } else {
      trackEvent('fitcheck_posted', { isPublic, hasProductUrl: !!productUrl });
      toast({ title: isPublic ? 'Posted to Fit Check!' : 'Saved privately' });
      onPosted();
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  const stepTitles = ['Pick a Try-On', 'Add a Question', 'Post'];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 pb-6">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <div className="w-8" />
            )}
            <SheetTitle className="text-sm font-bold">{stepTitles[step]}</SheetTitle>
            <div className="w-8" />
          </div>
          {/* Step indicator */}
          <div className="flex gap-1 justify-center pt-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step ? 'w-6 bg-primary' : i < step ? 'w-4 bg-primary/40' : 'w-4 bg-muted'
                }`}
              />
            ))}
          </div>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Pick a try-on */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pt-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-medium text-foreground">No try-ons yet</p>
                  <p className="text-xs text-muted-foreground">Create a try-on first, then come back to post it.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {posts.map(post => (
                    <button
                      key={post.id}
                      onClick={() => { setSelectedPost(post); setStep(1); }}
                      className={`relative rounded-lg overflow-hidden border-2 transition-all active:scale-95 ${
                        selectedPost?.id === post.id ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={post.result_photo_url} alt="Try-on" className="w-full aspect-[3/4] object-cover" />
                      {post.is_public && (
                        <div className="absolute top-1 right-1 bg-primary/80 rounded-full p-0.5">
                          <Globe className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Add question + product link */}
          {step === 1 && selectedPost && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pt-3 space-y-3">
              <div className="flex gap-3">
                <img src={selectedPost.result_photo_url} alt="Selected" className="w-20 h-28 rounded-lg object-cover border border-border" />
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Ask the community something…"
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    className="rounded-lg resize-none text-sm"
                    rows={3}
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Quick prompts</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROMPT_SUGGESTIONS.map(p => (
                    <button
                      key={p}
                      onClick={() => setCaption(p)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all active:scale-95 ${
                        caption === p ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product link collapsible */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setLinkExpanded(!linkExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">
                      Add product link <span className="text-[9px] text-muted-foreground/60">(optional)</span>
                      {!linkExpanded && <span className="text-[9px] text-muted-foreground/60"> — earn commission on clicks</span>}
                    </span>
                  </div>
                  {linkExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {linkExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product Link (optional)</p>
                    <Input
                      placeholder="https://zara.com/product/..."
                      value={productUrl}
                      onChange={e => setProductUrl(e.target.value)}
                      className="rounded-lg h-9 text-[12px]"
                    />
                    {detectedRetailer && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold flex items-center gap-1">
                          <Store className="h-3 w-3" /> {detectedRetailer}
                        </span>
                      </div>
                    )}
                    <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                      We may earn a commission when your followers shop this look. It doesn't change their price.
                    </p>
                  </div>
                )}
              </div>

              {/* Instagram post link */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setIgExpanded(!igExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left active:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Instagram className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">
                      Link Instagram post <span className="text-[9px] text-muted-foreground/60">(optional)</span>
                    </span>
                  </div>
                  {igExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {igExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <Input
                      placeholder="https://instagram.com/p/..."
                      value={igPostUrl}
                      onChange={e => setIgPostUrl(e.target.value)}
                      className="rounded-lg h-9 text-[12px]"
                    />
                    <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
                      Cross-post your fit — link your IG post so the community can find you there too.
                    </p>
                  </div>
                )}
              </div>

              {/* Clothing category selector */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">What type of clothing is this?</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'tops', label: 'Tops' },
                    { key: 'bottoms', label: 'Bottoms' },
                    { key: 'outerwear', label: 'Outerwear' },
                    { key: 'dress', label: 'Dress' },
                    { key: 'jumpsuit', label: 'Jumpsuit' },
                    { key: 'other', label: 'Other' },
                  ].map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setClothingCategory(cat.key)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${
                        clothingCategory === cat.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full rounded-lg btn-luxury text-primary-foreground h-10 text-sm font-bold"
                onClick={() => setStep(2)}
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 3: Review & post */}
          {step === 2 && selectedPost && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="pt-3 space-y-4">
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <img src={selectedPost.result_photo_url} alt="Preview" className="w-full aspect-[4/5] object-cover" />
                {caption && (
                  <p className="px-3 py-2 text-sm font-medium text-foreground">{caption}</p>
                )}
              </div>

              {productUrl && detectedRetailer && (
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-medium text-primary">{detectedRetailer}</span>
                  <span className="text-[9px] text-muted-foreground truncate flex-1">{productUrl}</span>
                </div>
              )}

              <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  {isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{isPublic ? 'Public' : 'Private'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isPublic ? 'Everyone on Fit Check can see & vote' : 'Only you can see this look'}
                    </p>
                  </div>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              <Button
                className="w-full rounded-lg btn-luxury text-primary-foreground h-11 text-sm font-bold"
                onClick={handlePost}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                {isPublic ? 'Post to Fit Check' : 'Save Look'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
};

export default PostLookFlow;
