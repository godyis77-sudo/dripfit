import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Save, Loader2, Search, Crown, Maximize2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { useBackgroundRemoval } from './useBackgroundRemoval';
import { useCanvasCompositor } from './useCanvasCompositor';

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

interface SearchPhoto {
  id: string;
  url: string;
  thumb: string;
  photographer: string;
  source: 'pexels' | 'unsplash';
  sourceUrl: string;
}

const BG_SUBJECT_CACHE_KEY = 'dripcheck_bg_subject';

function getCachedSubject(sourceUrl: string): string | null {
  try {
    const raw = sessionStorage.getItem(BG_SUBJECT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.sourceUrl === sourceUrl && parsed.blobUrl) return parsed.blobUrl;
  } catch { /* ignore */ }
  return null;
}

function setCachedSubject(sourceUrl: string, blobUrl: string) {
  try {
    sessionStorage.setItem(BG_SUBJECT_CACHE_KEY, JSON.stringify({ sourceUrl, blobUrl }));
  } catch { /* quota */ }
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
  const [usingCache, setUsingCache] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [subjectScale, setSubjectScale] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0); // -1 to 1
  const [offsetY, setOffsetY] = useState(0); // -1 to 1
  const dragRef = useRef<{ startX: number; startY: number; startOX: number; startOY: number } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
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

  // Auto-select first category with backgrounds when categories load
  const activeCategoryId = useMemo(() => categories.find(c => c.slug === activeCategory)?.id, [categories, activeCategory]);

  // Fetch backgrounds for active category
  const { data: backgrounds = [], isLoading: backgroundsLoading } = useQuery({
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

  // Search backgrounds via edge function
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['bg-search', debouncedQuery],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('search-backgrounds', {
        body: { query: debouncedQuery, perPage: 20 },
      });
      if (error) throw error;
      return (data?.results || []) as SearchPhoto[];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const [removalError, setRemovalError] = useState(false);

  const attemptRemoval = useCallback(async () => {
    setRemovalError(false);

    // Check cache first — skip expensive WASM if we already removed this image
    const cached = getCachedSubject(resultImageUrl);
    if (cached) {
      setTransparentSubject(cached);
      setUsingCache(true);
      return;
    }

    try {
      trackEvent('bg_swap_opened');
      const url = await removeBackground(resultImageUrl);
      setTransparentSubject(url);
      setCachedSubject(resultImageUrl, url);
    } catch (err) {
      console.error('BG removal failed:', err);
      setRemovalError(true);
      toast({ title: 'Background removal failed', description: 'Tap Retry to try again.', variant: 'destructive' });
    }
  }, [resultImageUrl, removeBackground, toast]);

  // Remove background on mount
  useEffect(() => {
    attemptRemoval();
  }, []);

  // Update preview when subject or background changes
  useEffect(() => {
    if (!transparentSubject || !canvasRef.current) return;
    compositePreview(canvasRef.current, transparentSubject, selectedBgUrl, selectedBgColor, subjectScale);
  }, [transparentSubject, selectedBgUrl, selectedBgColor, subjectScale, compositePreview]);

  const handleSelectBackground = useCallback((bg: BackgroundItem) => {
    if (bg.is_premium && !user) {
      toast({ title: 'Premium Background', description: 'Sign up for premium to unlock exclusive backgrounds.' });
      return;
    }
    setSelectedBgId(bg.id);
    setShowOriginal(false);
    setShowSearch(false);
    trackEvent('bg_background_selected', { bg_id: bg.id, source: bg.source });

    if (bg.storage_path.startsWith('solid:')) {
      setSelectedBgUrl(null);
      setSelectedBgColor(bg.storage_path.replace('solid:', ''));
    } else if (bg.storage_path.startsWith('http')) {
      // External URL (e.g. Pexels)
      setSelectedBgUrl(bg.storage_path);
      setSelectedBgColor('#0A0A0A');
    } else {
      const { data } = supabase.storage.from('backgrounds-curated').getPublicUrl(bg.storage_path);
      setSelectedBgUrl(data.publicUrl);
      setSelectedBgColor('#0A0A0A');
    }
  }, [user, toast]);

  const handleSelectSearchPhoto = useCallback((photo: SearchPhoto) => {
    setSelectedBgId(photo.id);
    setSelectedBgUrl(photo.url);
    setSelectedBgColor('#0A0A0A');
    setShowOriginal(false);
    trackEvent('bg_search_photo_selected', { photo_id: photo.id, source: photo.source });
  }, []);

  const handleShare = useCallback(async () => {
    if (!transparentSubject) return;
    setSharing(true);
    try {
      const dataUrl = await composite({
        subjectUrl: transparentSubject,
        backgroundUrl: selectedBgUrl,
        backgroundColor: selectedBgColor,
        addWatermark: true,
        scaleOverride: subjectScale,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'dripfit-look.jpg', { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My DripFit Look' });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'dripfit-look.jpg';
        a.click();
      }
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
        scaleOverride: subjectScale,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('tryon-composites').upload(path, blob, { contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      await supabase.from('saved_composites').insert({
        user_id: user.id,
        background_id: selectedBgId,
        background_source: selectedBgUrl ? 'search' : 'solid',
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

  const displayItems = showSearch && debouncedQuery.length >= 2 ? searchResults : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[hsl(var(--background))] flex flex-col overflow-hidden"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-[110] h-10 w-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center"
        style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
        aria-label="Close background swap"
      >
        <X className="h-5 w-5 text-foreground" />
      </button>

      {/* Fullscreen removal progress portal */}
      {(removing || removalError) && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[220] bg-background flex flex-col items-center justify-center"
        >
          {removing ? (
            <div className="flex flex-col items-center gap-5 px-8">
              <div className="relative h-24 w-24">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{progress}%</span>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-bold text-foreground">Removing background…</p>
                <p className="text-xs text-muted-foreground">This may take a moment on mobile devices</p>
              </div>
              <div className="w-56 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-base font-bold text-foreground">Background removal failed</p>
              <p className="text-sm text-muted-foreground">This can happen on devices with limited memory.</p>
              <div className="flex gap-3 mt-2">
                <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground">Close</button>
                <button onClick={attemptRemoval} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold">Retry</button>
              </div>
            </div>
          )}
        </motion.div>,
        document.body
      )}

      {/* Fullscreen preview portal */}
      {fullscreenPreview && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[230] bg-black flex items-center justify-center"
          onClick={() => setFullscreenPreview(false)}
        >
          <button
            onClick={() => setFullscreenPreview(false)}
            className="absolute top-4 right-4 z-[231] h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
            style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          {showOriginal ? (
            <img src={resultImageUrl} alt="Original fullscreen" className="max-h-full max-w-full object-contain" />
          ) : (
            <canvas
              ref={el => {
                if (el && transparentSubject) compositePreview(el, transparentSubject, selectedBgUrl, selectedBgColor, subjectScale);
              }}
              width={1080}
              height={1920}
              className="max-h-full max-w-full object-contain"
            />
          )}
        </motion.div>,
        document.body
      )}

      {/* Preview area */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden min-h-[30dvh] cursor-pointer group"
        onClick={() => transparentSubject && setFullscreenPreview(true)}
      >
        {showOriginal ? (
          <img
            src={resultImageUrl}
            alt="Original"
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={540}
            height={960}
            className="max-h-full max-w-full rounded-xl object-contain"
            style={{ imageRendering: 'auto' }}
          />
        )}
        {transparentSubject && (
          <div className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <Maximize2 className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Scale slider */}
      {transparentSubject && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-1.5">
          <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="range"
            min={30}
            max={100}
            step={1}
            value={subjectScale != null ? Math.round(subjectScale * 100) : 80}
            onChange={e => setSubjectScale(Number(e.target.value) / 100)}
            className="flex-1 h-1.5 accent-primary cursor-pointer"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => setSubjectScale(null)}
            className="text-[10px] font-bold text-primary px-2 py-1 rounded-md bg-primary/10 shrink-0"
          >
            Auto
          </button>
        </div>
      )}

      {/* Action bar */}
      {transparentSubject && (
        <div className="shrink-0 flex gap-2 px-4 py-2">
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
            className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-border text-foreground font-bold text-sm active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      )}

      {/* Background picker */}
      <div className="flex-1 min-h-0 flex flex-col bg-card/90 backdrop-blur-xl border-t border-border rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Search bar + category tabs */}
        <div className="shrink-0 px-3 pt-2.5 pb-1 flex items-center gap-2">
          <button
            onClick={() => {
              setShowSearch(s => !s);
              if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
              showSearch ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Search className="h-4 w-4" />
          </button>

          {showSearch ? (
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search backgrounds… (e.g. Tokyo, studio, beach)"
                className="w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searching && (
                <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          ) : (
            <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-hide">
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
                      : 'text-muted-foreground border border-border hover:border-foreground/20'
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="whitespace-nowrap">{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Background grid */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 pt-1">
          {displayItems ? (
            // Search results
            displayItems.length > 0 ? (
              <div className="grid grid-cols-4 gap-1.5">
                {displayItems.map(photo => {
                  const selected = selectedBgId === photo.id;
                  return (
                    <button
                      key={photo.id}
                      onClick={() => handleSelectSearchPhoto(photo)}
                      className={`relative aspect-square w-full rounded-lg overflow-hidden transition-all ${
                        selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'ring-1 ring-border'
                      }`}
                    >
                      <img
                        src={photo.thumb}
                        alt={photo.photographer}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                        <p className="text-[7px] text-white/70 truncate">📷 {photo.photographer}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center w-full py-4">
                <p className="text-[11px] text-muted-foreground">
                  {debouncedQuery.length < 2 ? 'Type at least 2 characters…' : 'No results found'}
                </p>
              </div>
            )
          ) : (categoriesLoading || backgroundsLoading) ? (
            // Loading state
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            // Category backgrounds
            <>
              <div className="grid grid-cols-4 gap-1.5">
                {/* Original background tile */}
                <button
                  onClick={() => {
                    setShowOriginal(true);
                    setSelectedBgId('__original__');
                    trackEvent('bg_background_selected', { bg_id: 'original' });
                  }}
                  className={`relative aspect-square w-full rounded-lg overflow-hidden transition-all ${
                    showOriginal ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'ring-1 ring-border'
                  }`}
                >
                  <img src={resultImageUrl} alt="Original" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                    <p className="text-[8px] text-white/90 font-bold text-center">Original</p>
                  </div>
                </button>
                {backgrounds.map(bg => {
                  const isSolid = bg.storage_path.startsWith('solid:');
                  const color = isSolid ? bg.storage_path.replace('solid:', '') : undefined;
                  const selected = selectedBgId === bg.id;
                  // Resolve thumbnail: use thumbnail_path if available, fall back to storage_path
                  const thumbSrc = !isSolid
                    ? (bg.thumbnail_path?.startsWith('http')
                        ? bg.thumbnail_path
                        : bg.storage_path.startsWith('http')
                          ? bg.storage_path
                          : bg.thumbnail_path
                            ? supabase.storage.from('backgrounds-curated').getPublicUrl(bg.thumbnail_path).data.publicUrl
                            : supabase.storage.from('backgrounds-curated').getPublicUrl(bg.storage_path).data.publicUrl)
                    : undefined;
                  return (
                    <button
                      key={bg.id}
                      onClick={() => handleSelectBackground(bg)}
                      className={`relative aspect-square w-full rounded-lg overflow-hidden transition-all ${
                        selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : 'ring-1 ring-border'
                      }`}
                    >
                      {isSolid ? (
                        <div className="w-full h-full" style={{ backgroundColor: color }} />
                      ) : (
                        <img
                          src={thumbSrc}
                          alt={bg.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {bg.is_premium && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Crown className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {backgrounds.length === 0 && !backgroundsLoading && (
                <div className="flex items-center justify-center w-full py-4">
                  <p className="text-[11px] text-muted-foreground">No backgrounds in this category yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BackgroundSwapOverlay;
