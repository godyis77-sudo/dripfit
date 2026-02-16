import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Shirt, Sparkles, Loader2, Share2, Image } from 'lucide-react';
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
        // Auto-save to profile (private by default)
        if (user) {
          autoSaveToProfile(data.resultImage);
        }
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
        // Post already saved — just update caption and public status
        // Find the latest post for this user
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
        // Fallback: full upload if auto-save didn't run
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

  return (
    <div className="min-h-screen bg-background px-6 py-6 pb-24">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Virtual Try-On</h1>
        </div>

        {/* Upload section */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <input ref={userPhotoRef} type="file" accept="image/*" onChange={handleFileSelect(setUserPhoto)} className="hidden" />
          <input ref={clothingPhotoRef} type="file" accept="image/*" onChange={handleFileSelect(setClothingPhoto)} className="hidden" />

          <Card className="rounded-2xl cursor-pointer overflow-hidden" onClick={() => userPhotoRef.current?.click()}>
            <CardContent className="p-0 aspect-[3/4] flex items-center justify-center">
              {userPhoto ? (
                <img src={userPhoto} alt="You" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                  <Image className="h-8 w-8" />
                   <p className="text-sm text-center font-semibold">Your Photo</p>
                  <p className="text-xs text-center font-medium text-foreground/60">Full body, front facing</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl cursor-pointer overflow-hidden" onClick={() => clothingPhotoRef.current?.click()}>
            <CardContent className="p-0 aspect-[3/4] flex items-center justify-center">
              {clothingPhoto ? (
                <img src={clothingPhoto} alt="Clothing" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                  <Shirt className="h-8 w-8" />
                   <p className="text-sm text-center font-semibold">Clothing Item</p>
                  <p className="text-xs text-center font-medium text-foreground/60">Photo of the item to try on</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        {!userPhoto && !clothingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-4 border border-border/30 mb-6"
          >
            <h3 className="font-display text-sm font-bold mb-2">How it works</h3>
            <ol className="space-y-1.5 text-sm font-medium text-foreground/70">
              <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Upload a full-body photo of yourself</li>
              <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Upload a photo of the clothing item</li>
              <li className="flex gap-2"><span className="text-primary font-bold">3.</span> AI generates you wearing the outfit</li>
            </ol>
          </motion.div>
        )}

        {/* Try-On button */}
        <Button
          className="w-full h-14 rounded-2xl text-base mb-6"
          onClick={handleTryOn}
          disabled={!userPhoto || !clothingPhoto || loading}
        >
          {loading ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="mr-2 h-5 w-5" /> Try It On</>
          )}
        </Button>

        {/* Result */}
        {resultImage && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl overflow-hidden mb-4">
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
              <div className="flex items-center justify-between bg-card rounded-2xl p-3 border border-border">
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
