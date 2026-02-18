import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Shirt, Sparkles, Loader2, Share2, Image, ArrowRight, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import BottomTabBar from '@/components/BottomTabBar';

const TryOn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const userPhotoRef = useRef<HTMLInputElement>(null);
  const clothingPhotoRef = useRef<HTMLInputElement>(null);

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [clothingPhoto, setClothingPhoto] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [shared, setShared] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  const handleFileSelect = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTryOn = async () => {
    if (!userPhoto || !clothingPhoto) return;
    setLoading(true);
    setResultImage(null);
    setDescription(null);

    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: { userPhoto, clothingPhoto },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data.resultImage) {
        setResultImage(data.resultImage);
        if (user) autoSaveToProfile(data.resultImage);
      } else if (data.description) {
        setDescription(data.description);
      }
    } catch (err: any) {
      toast({ title: 'Try-on failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const uploadBase64ToStorage = async (base64: string, folder: string): Promise<string> => {
    const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
    const ext = match ? match[1].split('/')[1] : 'jpeg';
    const data = match ? match[2] : base64;
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const fileName = `${user!.id}/${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from('tryon-images').upload(fileName, bytes, {
      contentType: match ? match[1] : 'image/jpeg',
    });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from('tryon-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const autoSaveToProfile = async (resultBase64: string) => {
    try {
      const [userUrl, clothingUrl, resultUrl] = await Promise.all([
        uploadBase64ToStorage(userPhoto!, 'user'),
        uploadBase64ToStorage(clothingPhoto!, 'clothing'),
        uploadBase64ToStorage(resultBase64, 'result'),
      ]);

      const { error } = await supabase.from('tryon_posts').insert({
        user_id: user!.id,
        user_photo_url: userUrl,
        clothing_photo_url: clothingUrl,
        result_photo_url: resultUrl,
        caption: null,
        is_public: false,
      });

      if (error) throw error;
      setAutoSaved(true);
      toast({ title: 'Saved!', description: 'Look saved to your profile for Drip Check feedback.' });
    } catch (err: any) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleShare = async () => {
    if (!user) return;
    setShared(true);

    try {
      if (autoSaved) {
        const { data: latestPosts } = await supabase
          .from('tryon_posts')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestPosts && latestPosts.length > 0) {
          const { error } = await supabase
            .from('tryon_posts')
            .update({ caption: caption || null, is_public: isPublic })
            .eq('id', latestPosts[0].id);
          if (error) throw error;
        }
      } else {
        const [userUrl, clothingUrl, resultUrl] = await Promise.all([
          uploadBase64ToStorage(userPhoto!, 'user'),
          uploadBase64ToStorage(clothingPhoto!, 'clothing'),
          uploadBase64ToStorage(resultImage!, 'result'),
        ]);

        const { error } = await supabase.from('tryon_posts').insert({
          user_id: user.id,
          user_photo_url: userUrl,
          clothing_photo_url: clothingUrl,
          result_photo_url: resultUrl,
          caption: caption || null,
          is_public: isPublic,
        });
        if (error) throw error;
      }

      toast({ title: isPublic ? 'Shared!' : 'Updated!', description: isPublic ? 'Your look is now in the community feed.' : 'Caption updated.' });
    } catch (err: any) {
      setShared(false);
      toast({ title: 'Share failed', description: err.message, variant: 'destructive' });
    }
  };

  const hasPhotos = userPhoto && clothingPhoto;
  const showHero = !userPhoto && !clothingPhoto && !resultImage;

  return (
    <div className="min-h-screen bg-background pb-24 overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] right-[-10%] h-[350px] w-[350px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-[30%] left-[-10%] h-[250px] w-[250px] rounded-full bg-accent/6 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-sm mx-auto px-5 pt-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="h-8 w-8 rounded-lg gradient-drip flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold tracking-wide">GET DRIPPED</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Virtual Try-On</p>
          </div>
        </motion.div>

        {/* Hero section when empty */}
        <AnimatePresence>
          {showHero && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="glass rounded-2xl border border-border/30 p-5 text-center mb-4">
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-2xl gradient-drip flex items-center justify-center">
                    <Shirt className="h-7 w-7 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="font-display text-xl font-bold mb-2">
                  See Any Outfit <span className="gradient-drip-text">On You</span>
                </h2>
                <p className="text-sm text-foreground/60 font-medium leading-relaxed max-w-[260px] mx-auto">
                  Upload your photo + a clothing item and our AI will show you wearing it.
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {[
                  { num: '1', text: 'Upload a full-body photo of yourself', icon: Image },
                  { num: '2', text: 'Upload a photo of the clothing item', icon: Shirt },
                  { num: '3', text: 'AI generates you wearing the outfit', icon: Sparkles },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                    className="flex items-center gap-3 glass rounded-xl p-3 border border-border/30"
                  >
                    <span className="font-display text-lg font-bold gradient-drip-text w-6 text-center">{step.num}</span>
                    <p className="text-sm font-medium flex-1">{step.text}</p>
                    <step.icon className="h-4 w-4 text-foreground/40 shrink-0" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: showHero ? 0.5 : 0, duration: 0.5 }}
        >
          <input ref={userPhotoRef} type="file" accept="image/*" onChange={handleFileSelect(setUserPhoto)} className="hidden" />
          <input ref={clothingPhotoRef} type="file" accept="image/*" onChange={handleFileSelect(setClothingPhoto)} className="hidden" />

          <div className="grid grid-cols-2 gap-3 mb-5">
            <Card
              className="rounded-2xl cursor-pointer overflow-hidden border-2 border-dashed border-border/50 hover:border-primary/40 transition-colors"
              onClick={() => userPhotoRef.current?.click()}
            >
              <CardContent className="p-0 aspect-[3/4] flex items-center justify-center">
                {userPhoto ? (
                  <img src={userPhoto} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Image className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm text-center font-semibold">Your Photo</p>
                    <p className="text-[11px] text-center font-medium text-foreground/50">Full body, front facing</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className="rounded-2xl cursor-pointer overflow-hidden border-2 border-dashed border-border/50 hover:border-primary/40 transition-colors"
              onClick={() => clothingPhotoRef.current?.click()}
            >
              <CardContent className="p-0 aspect-[3/4] flex items-center justify-center">
                {clothingPhoto ? (
                  <img src={clothingPhoto} alt="Clothing" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shirt className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm text-center font-semibold">Clothing Item</p>
                    <p className="text-[11px] text-center font-medium text-foreground/50">Photo of the item</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Try-On button */}
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 4, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              className="w-full h-14 rounded-2xl text-lg font-display font-extrabold uppercase tracking-widest btn-3d-drip border-0 mb-6"
              onClick={handleTryOn}
              disabled={!userPhoto || !clothingPhoto || loading}
              size="lg"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> GET DRIPPED</>
              )}
            </Button>
          </motion.div>
        </motion.div>

        {/* Result */}
        <AnimatePresence>
          {resultImage && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="rounded-2xl overflow-hidden mb-4 border-2 border-primary/25 shadow-[0_0_30px_-5px_hsl(42_45%_62%/0.25)]">
                <CardContent className="p-0">
                  <img src={resultImage} alt="Try-on result" className="w-full" />
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Textarea
                  placeholder="Add a caption…"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={2}
                />
                <div className="flex items-center justify-between glass rounded-2xl p-3 border border-border/30">
                  <span className="text-sm font-semibold text-foreground/80">Share to community</span>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
                <Button
                  className="w-full h-12 rounded-2xl"
                  onClick={() => {
                    if (!user) {
                      toast({ title: 'Sign in required', description: 'Create an account to share your look.', variant: 'destructive' });
                      navigate('/auth');
                      return;
                    }
                    handleShare();
                  }}
                  disabled={shared}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {shared ? 'Shared!' : isPublic ? 'Share to Community' : 'Save to My Posts'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {description && !resultImage && (
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-foreground/80">{description}</p>
            </CardContent>
          </Card>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default TryOn;
