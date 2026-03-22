import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Save, Loader2, Upload, Search, Lock, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { useBackgroundRemoval } from './useBackgroundRemoval';
import { useCanvasCompositor } from './useCanvasCompositor';
// Share utility - uses Web Share API or downloads

interface BackgroundSwapOverlayProps {
  resultImageUrl: string;
  onClose: () => void;
}

interface BackgroundItem {
  id: string;
  name: string;
  storage_path: string;
  thumbnail_path: string | null;
  is_premium: boolean;
  source: string;
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

const BackgroundSwapOverlay = ({ resultImageUrl, onClose }: BackgroundSwapOverlayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { removeBackground, removing, progress } = useBackgroundRemoval();
  const { composite, compositePreview } = useCanvasCompositor();

  const [transparentSubject, setTransparentSubject] = useState<string | null>(null);
  const [selectedBgId, setSelectedBgId] = useState<string | null>(null);
  const [selectedBgUrl, setSelectedBgUrl] = useState<string | null>(null);
  const [selectedBgColor, setSelectedBgColor] = useState('#0A0A0A');
  const [activeCategory, setActiveCategory] = useState<string>('solid-colors');
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['bg-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('background_categories')
        .select('id, name, slug, icon')
        .order('sort_order');
      return (data || []) as CategoryItem[];
    },
    staleTime: 60 * 60 * 1000,
  });

  // Fetch backgrounds for active category
  const activeCategoryId = useMemo(() => categories.find(c => c.slug === activeCategory)?.id, [categories, activeCategory]);

  const { data: backgrounds = [] } = useQuery({
    queryKey: ['bg-items', activeCategoryId],
    queryFn: async () => {
      if (!activeCategoryId) return [];
      const { data } = await supabase
        .from('backgrounds')
        .select('id, name, storage_path, thumbnail_path, is_premium, source')
        .eq('category_id', activeCategoryId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });
      return (data || []) as BackgroundItem[];
    },
    enabled: !!activeCategoryId,
    staleTime: 5 * 60 * 1000,
  });

  // Remove background on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        trackEvent('bg_swap_opened');
        const url = await removeBackground(resultImageUrl);
        if (!cancelled) setTransparentSubject(url);
      } catch (err) {
        console.error('BG removal failed:', err);
        toast({ title: 'Background removal failed', description: 'Please try again.', variant: 'destructive' });
        onClose();
      }
    })();
    return () => { cancelled = true; };
  }, [resultImageUrl]);

  // Update preview when subject or background changes
  useEffect(() => {
    if (!transparentSubject || !canvasRef.current) return;
    compositePreview(canvasRef.current, transparentSubject, selectedBgUrl, selectedBgColor);
  }, [transparentSubject, selectedBgUrl, selectedBgColor, compositePreview]);

  const handleSelectBackground = useCallback((bg: BackgroundItem) => {
    if (bg.is_premium && !user) {
      toast({ title: 'Premium Background', description: 'Sign up for premium to unlock exclusive backgrounds.' });
      return;
    }
    setSelectedBgId(bg.id);
    trackEvent('bg_background_selected', { bg_id: bg.id, source: bg.source });

    if (bg.storage_path.startsWith('solid:')) {
      setSelectedBgUrl(null);
      setSelectedBgColor(bg.storage_path.replace('solid:', ''));
    } else {
      const { data } = supabase.storage.from('backgrounds-curated').getPublicUrl(bg.storage_path);
      setSelectedBgUrl(data.publicUrl);
      setSelectedBgColor('#0A0A0A');
    }
  }, [user, toast]);

  const handleShare = useCallback(async () => {
    if (!transparentSubject) return;
    setSharing(true);
    try {
      const dataUrl = await composite({
        subjectUrl: transparentSubject,
        backgroundUrl: selectedBgUrl,
        backgroundColor: selectedBgColor,
        addWatermark: true,
      });
      await shareImage(dataUrl, 'My DripFit look');
      trackEvent('bg_composite_shared');
    } catch (err) {
      console.error('Share failed:', err);
      toast({ title: 'Share failed', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  }, [transparentSubject, selectedBgUrl, selectedBgColor, composite, toast]);

  const handleSave = useCallback(async () => {
    if (!transparentSubject || !user) {
      toast({ title: 'Sign in to save', description: 'Create an account to save your composites.' });
      return;
    }
    setSaving(true);
    try {
      const dataUrl = await composite({
        subjectUrl: transparentSubject,
        backgroundUrl: selectedBgUrl,
        backgroundColor: selectedBgColor,
        addWatermark: true,
      });
      // Convert to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('tryon-composites').upload(path, blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      await supabase.from('saved_composites').insert({
        user_id: user.id,
        background_id: selectedBgId,
        background_source: selectedBgUrl ? 'curated' : 'solid',
        storage_path: path,
      });
      trackEvent('bg_composite_saved');
      toast({ title: 'Saved!', description: 'Composite saved to your gallery.' });
    } catch (err) {
      console.error('Save failed:', err);
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [transparentSubject, user, selectedBgUrl, selectedBgColor, selectedBgId, composite, toast]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-[110] h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center"
        style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
        aria-label="Close background swap"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Preview area (top 65%) */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden" style={{ minHeight: '60%' }}>
        {removing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-white/80 font-medium">Removing background…</p>
            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-white/40">{progress}%</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={540}
            height={960}
            className="max-h-full max-w-full rounded-xl object-contain"
            style={{ imageRendering: 'auto' }}
          />
        )}
      </div>

      {/* Action bar */}
      {transparentSubject && (
        <div className="flex gap-2 px-4 py-2">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl btn-luxury text-primary-foreground font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Apply & Share
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-white/20 text-white font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      )}

      {/* Background picker (bottom ~35%) */}
      <div className="bg-[#1C1C1C]/90 backdrop-blur-xl border-t border-white/5 rounded-t-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto px-3 py-2.5 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => {
                setActiveCategory(cat.slug);
                trackEvent('bg_category_selected', { category: cat.slug });
              }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                activeCategory === cat.slug
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-white/60 border border-white/10 hover:border-white/20'
              }`}
            >
              <span className="text-sm">{cat.icon}</span>
              <span className="whitespace-nowrap">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Background grid */}
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-3 scrollbar-hide">
          {backgrounds.map(bg => {
            const isSolid = bg.storage_path.startsWith('solid:');
            const color = isSolid ? bg.storage_path.replace('solid:', '') : undefined;
            const selected = selectedBgId === bg.id;
            return (
              <button
                key={bg.id}
                onClick={() => handleSelectBackground(bg)}
                className={`shrink-0 relative rounded-lg overflow-hidden transition-all ${
                  selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-[#1C1C1C]' : 'ring-1 ring-white/10'
                }`}
                style={{ width: 72, height: 72 }}
              >
                {isSolid ? (
                  <div className="w-full h-full" style={{ backgroundColor: color }} />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-[8px] text-white/30">{bg.name}</span>
                  </div>
                )}
                {bg.is_premium && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Crown className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            );
          })}
          {backgrounds.length === 0 && (
            <div className="flex items-center justify-center w-full py-4">
              <p className="text-[11px] text-white/40">No backgrounds in this category yet</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BackgroundSwapOverlay;
