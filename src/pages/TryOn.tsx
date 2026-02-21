import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { ArrowLeft, Shirt, Sparkles, Loader2, Share2, Shield, User, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';

const DEMO_OUTFITS = [
  { label: 'White Tee', color: 'bg-card' },
  { label: 'Denim Jacket', color: 'bg-blue-900/30' },
  { label: 'Black Hoodie', color: 'bg-foreground/10' },
  { label: 'Blazer', color: 'bg-muted' },
];

const TryOn = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const userPhotoRef = useRef<HTMLInputElement>(null);
  const clothingPhotoRef = useRef<HTMLInputElement>(null);
  const bodyProfile = (location.state as any)?.bodyProfile;

  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [clothingPhoto, setClothingPhoto] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [shared, setShared] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  const hasSavedProfile = !!localStorage.getItem('dripcheck_scans') && JSON.parse(localStorage.getItem('dripcheck_scans') || '[]').length > 0;

  const handleFileSelect = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTryOn = async () => {
    if (!userPhoto) { toast({ title: 'Photo required', description: 'Upload your photo first.', variant: 'destructive' }); return; }
    if (!clothingPhoto) { toast({ title: 'Clothing required', description: 'Upload or select a clothing item.', variant: 'destructive' }); return; }
    setLoading(true);
    setResultImage(null);
    setDescription(null);
    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', { body: { userPhoto, clothingPhoto } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      trackEvent('tryon_generated');
      if (data.resultImage) { setResultImage(data.resultImage); if (user) autoSaveToProfile(data.resultImage); }
      else if (data.description) { setDescription(data.description); }
    } catch (err: any) {
      toast({ title: 'Try-on failed', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const uploadBase64ToStorage = async (base64: string, folder: string): Promise<string> => {
    const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
    const ext = match ? match[1].split('/')[1] : 'jpeg';
    const data = match ? match[2] : base64;
    const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const fileName = `${user!.id}/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('tryon-images').upload(fileName, bytes, { contentType: match ? match[1] : 'image/jpeg' });
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
      const { error } = await supabase.from('tryon_posts').insert({ user_id: user!.id, user_photo_url: userUrl, clothing_photo_url: clothingUrl, result_photo_url: resultUrl, caption: null, is_public: false });
      if (error) throw error;
      setAutoSaved(true);
      toast({ title: 'Saved!', description: 'Look saved to your profile.' });
    } catch (err: any) { console.error('Auto-save failed:', err); }
  };

  const handleShare = async () => {
    if (!user) { toast({ title: 'Sign in required', description: 'Create an account to share.', variant: 'destructive' }); navigate('/auth'); return; }
    setShared(true);
    try {
      if (autoSaved) {
        const { data: latestPosts } = await supabase.from('tryon_posts').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        if (latestPosts && latestPosts.length > 0) await supabase.from('tryon_posts').update({ caption: caption || null, is_public: isPublic }).eq('id', latestPosts[0].id);
      } else {
        const [userUrl, clothingUrl, resultUrl] = await Promise.all([
          uploadBase64ToStorage(userPhoto!, 'user'),
          uploadBase64ToStorage(clothingPhoto!, 'clothing'),
          uploadBase64ToStorage(resultImage!, 'result'),
        ]);
        await supabase.from('tryon_posts').insert({ user_id: user.id, user_photo_url: userUrl, clothing_photo_url: clothingUrl, result_photo_url: resultUrl, caption: caption || null, is_public: isPublic });
      }
      toast({ title: isPublic ? 'Shared!' : 'Updated!', description: isPublic ? 'Your look is now in the community feed.' : 'Caption updated.' });
    } catch (err: any) {
      setShared(false);
      toast({ title: 'Share failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-20">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground">Virtual Try-On</h1>
        </div>

        {/* Saved body profile */}
        {(hasSavedProfile || bodyProfile) && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3">
            <div>
              <p className="text-[11px] font-bold text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Body Profile Saved</p>
              <p className="text-[10px] text-muted-foreground">Improves try-on accuracy</p>
            </div>
            {!bodyProfile && (
              <Button variant="ghost" size="sm" className="text-[11px] text-primary h-7 px-2" onClick={() => navigate('/capture')}>Re-scan</Button>
            )}
          </div>
        )}

        {/* Upload cards */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input ref={userPhotoRef} type="file" accept="image/*" onChange={handleFileSelect(setUserPhoto)} className="hidden" />
          <input ref={clothingPhotoRef} type="file" accept="image/*" onChange={handleFileSelect(setClothingPhoto)} className="hidden" />

          <button onClick={() => userPhotoRef.current?.click()} className="rounded-xl overflow-hidden border border-border bg-card active:scale-[0.97] transition-transform">
            <div className="aspect-[3/4] flex items-center justify-center">
              {userPhoto ? (
                <img src={userPhoto} alt="You" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground p-3">
                  <User className="h-6 w-6" />
                  <p className="text-[11px] font-semibold">Your Photo</p>
                  <p className="text-[10px] text-muted-foreground">Full body, front</p>
                </div>
              )}
            </div>
          </button>

          <button onClick={() => clothingPhotoRef.current?.click()} className="rounded-xl overflow-hidden border border-border bg-card active:scale-[0.97] transition-transform">
            <div className="aspect-[3/4] flex items-center justify-center">
              {clothingPhoto ? (
                <img src={clothingPhoto} alt="Clothing" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground p-3">
                  <Shirt className="h-6 w-6" />
                  <p className="text-[11px] font-semibold">Clothing Item</p>
                  <p className="text-[10px] text-muted-foreground">Upload or pick</p>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Quick picks */}
        {!clothingPhoto && (
          <div className="mb-3">
            <p className="section-label mb-1.5">Quick picks</p>
            <div className="grid grid-cols-4 gap-1.5">
              {DEMO_OUTFITS.map(o => (
                <button
                  key={o.label}
                  className="flex flex-col items-center p-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors active:scale-95"
                  onClick={() => toast({ title: 'Coming soon', description: `${o.label} catalog coming soon!` })}
                >
                  <div className={`w-full aspect-square rounded-md ${o.color} mb-1 flex items-center justify-center`}>
                    <Shirt className="h-4 w-4 text-foreground/20" />
                  </div>
                  <p className="text-[9px] text-muted-foreground font-medium leading-tight text-center">{o.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate */}
        <Button className="w-full h-11 rounded-lg text-sm font-bold mb-2 btn-luxury text-primary-foreground active:scale-[0.97] transition-transform" onClick={handleTryOn} disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Try-On</>}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1 mb-3">
          <Shield className="h-3 w-3" /> Private · delete anytime
        </p>

        {/* Result */}
        {resultImage && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-xl overflow-hidden border border-border mb-3">
              <img src={resultImage} alt="Try-on result" className="w-full" />
            </div>
            <div className="space-y-2">
              <Textarea placeholder="Add a caption…" value={caption} onChange={e => setCaption(e.target.value)} className="rounded-lg resize-none text-sm" rows={2} />
              <div className="flex items-center justify-between bg-card rounded-lg p-2.5 border border-border">
                <span className="text-[13px] font-semibold text-foreground/70">Share to community</span>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <Button className="w-full h-10 rounded-lg btn-luxury text-primary-foreground text-sm" onClick={handleShare} disabled={shared}>
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                {shared ? 'Shared!' : isPublic ? 'Share to Community' : 'Save to My Posts'}
              </Button>
            </div>
          </motion.div>
        )}

        {description && !resultImage && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[13px] text-foreground/80">{description}</p>
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default TryOn;
