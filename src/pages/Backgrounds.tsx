import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Crown, X, Download, Share2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { trackEvent } from '@/lib/analytics';
import PageHeader from '@/components/layout/PageHeader';

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

const Backgrounds = () => {
  usePageTitle('Backgrounds');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('solid-colors');
  const [selectedBg, setSelectedBg] = useState<{ url: string; name: string; isPremium: boolean; photographer?: string } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Categories
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

  const activeCategoryId = useMemo(
    () => categories.find(c => c.slug === activeCategory)?.id,
    [categories, activeCategory]
  );

  // Backgrounds for category
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

  // Search
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['bg-search', debouncedQuery],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('search-backgrounds', {
        body: { query: debouncedQuery, perPage: 30 },
      });
      if (error) throw error;
      return (data?.results || []) as SearchPhoto[];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const resolveUrl = useCallback((bg: BackgroundItem) => {
    if (bg.storage_path.startsWith('solid:')) return null;
    const { data } = supabase.storage.from('backgrounds-curated').getPublicUrl(bg.storage_path);
    return data.publicUrl;
  }, []);

  const handleSelectBackground = useCallback((bg: BackgroundItem) => {
    if (bg.is_premium && !user) {
      toast({ title: 'Premium Background', description: 'Sign up for premium to unlock exclusive backgrounds.' });
      return;
    }
    const isSolid = bg.storage_path.startsWith('solid:');
    const color = isSolid ? bg.storage_path.replace('solid:', '') : undefined;
    const url = isSolid
      ? `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'><rect fill='${encodeURIComponent(color!)}' width='1' height='1'/></svg>`
      : resolveUrl(bg)!;
    setSelectedBg({ url, name: bg.name, isPremium: bg.is_premium });
    trackEvent('bg_page_selected', { bg_id: bg.id });
  }, [user, toast, resolveUrl]);

  const handleSelectSearch = useCallback((photo: SearchPhoto) => {
    setSelectedBg({ url: photo.url, name: `Photo by ${photo.photographer}`, isPremium: false, photographer: photo.photographer });
    trackEvent('bg_page_search_selected', { photo_id: photo.id, source: photo.source });
  }, []);

  const handleDownload = useCallback(async () => {
    if (!selectedBg) return;
    try {
      const res = await fetch(selectedBg.url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `dripfit-bg-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
      trackEvent('bg_page_downloaded');
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' });
    }
  }, [selectedBg, toast]);

  const handleShare = useCallback(async () => {
    if (!selectedBg) return;
    try {
      const res = await fetch(selectedBg.url);
      const blob = await res.blob();
      const file = new File([blob], 'dripfit-background.jpg', { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: selectedBg.name });
      } else {
        handleDownload();
      }
    } catch {
      toast({ title: 'Share failed', variant: 'destructive' });
    }
  }, [selectedBg, toast, handleDownload]);

  const displayItems = showSearch && debouncedQuery.length >= 2 ? searchResults : null;
  const isLoading = categoriesLoading || backgroundsLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Backgrounds" />

      {/* Large preview area */}
      <div className="px-4 pt-2 pb-4">
        <div className="relative w-full aspect-[3/4] max-h-[50vh] rounded-2xl overflow-hidden bg-card border border-border flex items-center justify-center">
          <AnimatePresence mode="wait">
            {selectedBg ? (
              <motion.img
                key={selectedBg.url}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                src={selectedBg.url}
                alt={selectedBg.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 text-muted-foreground"
              >
                <ImageIcon className="h-12 w-12 opacity-40" />
                <p className="text-sm font-medium">Select a background to preview</p>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedBg && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-sm font-bold truncate">{selectedBg.name}</p>
              {selectedBg.photographer && (
                <p className="text-white/60 text-[10px]">📷 {selectedBg.photographer}</p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {selectedBg && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl btn-luxury text-primary-foreground font-bold text-sm active:scale-[0.97] transition-transform"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-border text-foreground font-bold text-sm active:scale-[0.97] transition-transform"
            >
              <Download className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={() => setSelectedBg(null)}
              className="flex items-center justify-center h-11 w-11 rounded-xl border border-border text-muted-foreground active:scale-[0.97] transition-transform"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search bar + category tabs */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <button
          onClick={() => {
            setShowSearch(s => !s);
            if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 100);
          }}
          className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
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
              className="w-full h-10 rounded-xl bg-muted border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {searching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        ) : (
          <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.slug}
                onClick={() => {
                  setActiveCategory(cat.slug);
                  trackEvent('bg_page_category', { category: cat.slug });
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-colors ${
                  activeCategory === cat.slug
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground border border-border hover:border-foreground/20'
                }`}
              >
                {cat.icon && <span className="text-sm">{cat.icon}</span>}
                <span className="whitespace-nowrap">{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Background grid */}
      <div className="px-4">
        {displayItems ? (
          // Search results
          <div className="grid grid-cols-3 gap-2">
            {displayItems.length > 0 ? displayItems.map(photo => (
              <button
                key={photo.id}
                onClick={() => handleSelectSearch(photo)}
                className={`relative rounded-xl overflow-hidden aspect-[3/4] transition-all ${
                  selectedBg?.url === photo.url ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'ring-1 ring-border'
                }`}
              >
                <img src={photo.thumb} alt={photo.photographer} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                  <p className="text-[8px] text-white/70 truncate">📷 {photo.photographer}</p>
                </div>
              </button>
            )) : (
              <div className="col-span-3 flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">
                  {debouncedQuery.length < 2 ? 'Type at least 2 characters…' : 'No results found'}
                </p>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {backgrounds.map(bg => {
              const isSolid = bg.storage_path.startsWith('solid:');
              const color = isSolid ? bg.storage_path.replace('solid:', '') : undefined;
              const thumbUrl = !isSolid
                ? (bg.thumbnail_path
                    ? supabase.storage.from('backgrounds-curated').getPublicUrl(bg.thumbnail_path).data.publicUrl
                    : supabase.storage.from('backgrounds-curated').getPublicUrl(bg.storage_path).data.publicUrl)
                : undefined;
              const isSelected = selectedBg?.name === bg.name;

              return (
                <button
                  key={bg.id}
                  onClick={() => handleSelectBackground(bg)}
                  className={`relative rounded-xl overflow-hidden aspect-[3/4] transition-all ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'ring-1 ring-border'
                  }`}
                >
                  {isSolid ? (
                    <div className="w-full h-full" style={{ backgroundColor: color }} />
                  ) : (
                    <img src={thumbUrl} alt={bg.name} className="w-full h-full object-cover" loading="lazy" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-1">
                    <p className="text-[9px] text-white/80 truncate font-medium">{bg.name}</p>
                  </div>
                  {bg.is_premium && (
                    <div className="absolute top-1.5 right-1.5">
                      <Crown className="h-3.5 w-3.5 text-primary drop-shadow-lg" />
                    </div>
                  )}
                </button>
              );
            })}
            {backgrounds.length === 0 && !backgroundsLoading && (
              <div className="col-span-3 flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No backgrounds in this category yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Backgrounds;
