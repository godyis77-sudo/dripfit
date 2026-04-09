import { useState, useRef, useEffect, useMemo, forwardRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Check, MessageSquare, Save, RotateCcw, ShoppingBag, Camera, ImageIcon, Bookmark, ChevronRight, ChevronDown, X, ArrowLeftRight, ExternalLink, Image, Share, Download, Copy, SlidersHorizontal } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import WhatsInThisLook, { type LookItem as WhatsLookItem } from '@/components/community/WhatsInThisLook';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import BrandFilter from '@/components/tryon/BrandFilter';
import { ACCESSORY_CATEGORIES, ALL_PRODUCT_CATEGORIES, getCaptionSuggestions, saveSharePreference, compressImage, imageUrlToBase64 } from './tryon-constants';
import { isCategoryVisibleForGender } from '@/lib/genderCategories';
import { BRAND_GENRES, type BrandGenre } from '@/lib/brandGenres';
import type { CatalogProduct } from '@/hooks/useProductCatalog';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TryOnLoadingAnimation from '@/components/tryon/TryOnLoadingAnimation';
import BackgroundSwapOverlay from '@/components/bgswap/BackgroundSwapOverlay';
import ErrorBoundary from '@/components/ErrorBoundary';
import DripCard from '@/components/results/DripCard';
import ProductPreviewModal, { type ProductPreviewData } from '@/components/ui/ProductPreviewModal';
import { useCart } from '@/hooks/useCart';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';
import { Share2, Link2, MessageCircle } from 'lucide-react';
import { useToast as useToastHook } from '@/hooks/use-toast';

/** Zoomable image for fullscreen result view (pinch + double-tap) */
function ZoomableResultImage({ src, brandLabel }: { src: string; brandLabel?: string | null }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && zoom > 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsPanning(true);
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / lastDist.current;
      setZoom(prev => Math.min(4, Math.max(1, prev * scale)));
      lastDist.current = dist;
    } else if (e.touches.length === 1 && isPanning && lastTouch.current && zoom > 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [isPanning, zoom]);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = null;
    lastTouch.current = null;
    setIsPanning(false);
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); } else { setZoom(2.5); }
  }, [zoom]);

  return (
    <div
      className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden touch-none"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div className="relative h-full w-full rounded-2xl overflow-hidden bg-muted">
        {brandLabel && zoom <= 1 && (
          <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-black/70 border border-white/25 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider">
            {brandLabel}
          </span>
        )}
        {zoom > 1 && (
          <button
            type="button"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-black/70 border border-white/25 backdrop-blur-sm text-[11px] font-bold text-white active:scale-95 transition-transform"
          >
            Reset Zoom
          </button>
        )}
        <img
          src={src}
          alt="Try-on result full screen"
          className="absolute inset-0 h-full w-full object-cover rounded-2xl block"
          style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transition: isPanning ? 'none' : 'transform 0.15s ease-out' }}
          draggable={false}
        />
      </div>
    </div>
  );
}


function ShareNudgeInline({ resultImage, caption, onShareStory }: { resultImage: string; caption: string; onShareStory: () => void }) {
  const { toast } = useToastHook();
  const shareUrl = `${window.location.origin}/style-check`;
  const handleCopy = async () => { await navigator.clipboard.writeText(shareUrl); toast({ title: 'Link copied!' }); trackEvent('share_nudge_copy_link', {}); };
  const handleShare = async () => {
    trackEvent('share_nudge_native', {});
    try { if (navigator.share) { await navigator.share({ title: 'Check my fit on DripFit', text: caption || 'Check out this try-on!', url: shareUrl }); } else { handleCopy(); } } catch {}
  };
  const handleWhatsApp = () => { trackEvent('share_nudge_whatsapp', {}); window.open(`https://wa.me/?text=${encodeURIComponent(`${caption || 'Check out my fit!'} ${shareUrl}`)}`, '_blank', 'noopener'); };
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <p className="text-sm font-bold text-foreground mb-2 text-center">Share this look? 🔥</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1 h-9 rounded-lg text-[11px] font-semibold gap-1.5"><Link2 className="h-3.5 w-3.5" /> Copy</Button>
        <Button variant="outline" size="sm" onClick={handleWhatsApp} className="h-9 rounded-lg text-[11px] font-semibold gap-1.5 px-3"><MessageCircle className="h-3.5 w-3.5" /></Button>
        <Button size="sm" onClick={handleShare} className="h-9 rounded-lg text-[11px] font-bold gap-1.5 btn-luxury text-primary-foreground px-3"><Share2 className="h-3.5 w-3.5" /> Share</Button>
      </div>
    </div>
  );
}

interface LookItem {
  brand: string;
  name: string;
  url: string;
  price_cents?: number | null;
  image_url?: string | null;
}

interface TryOnResultSectionProps {
  resultImage: string;
  userPhoto: string | null;
  clothingPhoto: string | null;
  category: string;
  productLink: string;
  selectedQuickPick: CatalogProduct | null;
  lookItems: LookItem[];
  showLookItems: boolean;
  user: any;
  isPublic: boolean;
  caption: string;
  shared: boolean;
  showPostUI: boolean;
  showSuccessOverlay: boolean;
  savedToItems: boolean;
  layerHistory: string[];
  userGender: string | null;
  hasUnlimitedTryOns: boolean;
  addingAccessory: boolean;
  sharing: boolean;
  onSetCaption: (v: string) => void;
  onSetIsPublic: (v: boolean) => void;
  onSetShowPostUI: (v: boolean) => void;
  onShare: () => void;
  onTryAnother: () => void;
  onSaveToItems: () => void;
  onAddAccessory: (photo: string, category: string | null, product?: CatalogProduct | null) => void;
  onSetLookItems: (fn: (prev: LookItem[]) => LookItem[]) => void;
  onToast: (opts: any) => void;
}

const GENDER_OPTIONS = [
  { key: 'all' as const, label: 'All' },
  { key: 'mens' as const, label: "Men's" },
  { key: 'womens' as const, label: "Women's" },
];

const FIT_OPTIONS = [
  'athletic fit', 'baggy', 'bootcut', 'boxy', 'classic fit', 'cropped',
  'drop shoulder', 'fitted', 'flare', 'heavyweight', 'high rise',
  'lightweight', 'longline', 'loose fit', 'low rise', 'mid rise',
  'muscle fit', 'oversized', 'regular fit', 'relaxed fit', 'skinny fit',
  'slim fit', 'straight fit', 'tailored fit', 'tapered', 'wide leg',
] as const;

// Gold checkmark SVG
const AnimatedCheckmark = forwardRef<SVGSVGElement>((_, ref) => (
  <svg ref={ref} width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.3" />
    <motion.path d="M20 32L28 40L44 24" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
  </svg>
));
AnimatedCheckmark.displayName = 'AnimatedCheckmark';

const TryOnResultSection = ({
  resultImage, userPhoto, clothingPhoto, category, productLink, selectedQuickPick,
  lookItems, showLookItems, user, isPublic, caption, shared, showPostUI,
  showSuccessOverlay, savedToItems, layerHistory, userGender,
  hasUnlimitedTryOns, addingAccessory, sharing,
  onSetCaption, onSetIsPublic, onSetShowPostUI, onShare, onTryAnother,
  onSaveToItems, onAddAccessory, onSetLookItems, onToast,
}: TryOnResultSectionProps) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [showAccessorySection, setShowAccessorySection] = useState(false);
  const [accessoryPhoto, setAccessoryPhoto] = useState<string | null>(null);
  const [accessoryCategory, setAccessoryCategory] = useState<string | null>(null);
  const [selectedAccessoryProduct, setSelectedAccessoryProduct] = useState<CatalogProduct | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(true);
  const [showShopPicker, setShowShopPicker] = useState(false);
  const [accFiltersOpen, setAccFiltersOpen] = useState(false);
  const [accBrandFilter, setAccBrandFilter] = useState<string | null>(null);
  const [accRetailerFilter, setAccRetailerFilter] = useState<string | null>(null);
  const [accSort, setAccSort] = useState<'default' | 'price_asc' | 'price_desc' | 'brand_az'>('default');
  const [accGenderOverride, setAccGenderOverrideRaw] = useState<'all' | 'mens' | 'womens' | null>(() => {
    const saved = localStorage.getItem('drip_gender_filter');
    if (saved === 'mens' || saved === 'womens' || saved === 'all') return saved;
    return null;
  });
  const setAccGenderOverride = (v: 'all' | 'mens' | 'womens' | null) => { setAccGenderOverrideRaw(v); if (v) localStorage.setItem('drip_gender_filter', v); };
  const [accGenreFilter, setAccGenreFilter] = useState<BrandGenre | null>(null);
  const [accFitFilter, setAccFitFilter] = useState<string | null>(null);
  const [accGenreOpen, setAccGenreOpen] = useState(false);
  const [accFitOpen, setAccFitOpen] = useState(false);
  const [accRetailerOpen, setAccRetailerOpen] = useState(false);
  const defaultAccGender = userGender === 'male' ? 'mens' as const : userGender === 'female' ? 'womens' as const : 'all' as const;
  const accGender = accGenderOverride ?? defaultAccGender;
  const accEffectiveGender = accGender === 'all' ? undefined : accGender;

  // Fetch products for accessory grid to derive retailers/fits
  const { products: accProducts } = useProductCatalog(
    accessoryCategory || undefined, undefined, undefined, accEffectiveGender, accGenreFilter ?? undefined, accFitFilter ?? undefined
  );

  const accAvailableRetailers = useMemo(() => [...new Set(accProducts.map(p => p.retailer))].sort(), [accProducts]);
  const accAvailableFits = useMemo(() => {
    const fits = new Set<string>();
    accProducts.forEach(p => { if (Array.isArray(p.fit_profile)) p.fit_profile.forEach(f => fits.add(f)); });
    return FIT_OPTIONS.filter(f => fits.has(f));
  }, [accProducts]);

  const accessoryPhotoRef = useRef<HTMLInputElement>(null);
  const accessoryCameraRef = useRef<HTMLInputElement>(null);
  const accessorySectionRef = useRef<HTMLDivElement>(null);
  const [accessoryStepIndex, setAccessoryStepIndex] = useState(0);
  const [showResultFullscreen, setShowResultFullscreen] = useState(false);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [showBgSwap, setShowBgSwap] = useState(false);
  const [sharingDripCard, setSharingDripCard] = useState(false);
  const [shareFallbackOpen, setShareFallbackOpen] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareCardImageUrl, setShareCardImageUrl] = useState<string | null>(null);
  const dripCardRef = useRef<HTMLDivElement>(null);
  const [itemPreview, setItemPreview] = useState<ProductPreviewData | null>(null);
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } = useAffiliateClickout({ extraProps: { source: 'tryon_item_preview' } });

  const dataUrlToFile = (dataUrl: string, fileName: string) => {
    const [meta, base64] = dataUrl.split(',');
    if (!meta || !base64) throw new Error('Invalid share image data');
    const mimeMatch = meta.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], fileName, { type: mime });
  };

  const waitForImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll('img'));
    await Promise.all(images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    }));
  };

  const handleShareDripCard = async () => {
    setSharingDripCard(true);
    trackEvent('tryon_drip_card_share_start');
    try {
      const { toPng } = await import('html-to-image');

      const shareReadyImage = (resultImage.startsWith('http://') || resultImage.startsWith('https://'))
        ? await imageUrlToBase64(resultImage).catch(() => resultImage)
        : resultImage;

      setShareCardImageUrl(shareReadyImage);
      await new Promise(r => setTimeout(r, 380));
      if (!dripCardRef.current) throw new Error('DripCard not mounted');

      await waitForImages(dripCardRef.current);
      const dataUrl = await toPng(dripCardRef.current, { width: 1080, height: 1920, pixelRatio: 1 });
      const file = dataUrlToFile(dataUrl, 'drip-fit-tryon.png');
      trackEvent('tryon_drip_card_generated');

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ text: 'Check out my fit — verified by DRIPFIT ✔', url: 'https://dripfitcheck.lovable.app', files: [file] });
      } else {
        setShareImageUrl(dataUrl);
        setShareFallbackOpen(true);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('DripCard share failed:', err);
        onToast({ title: 'Share failed', description: 'Could not generate share card.', variant: 'destructive' });
      }
    } finally {
      setSharingDripCard(false);
      setShareCardImageUrl(null);
    }
  };

  const handleShareDownload = () => {
    if (!shareImageUrl) return;
    const a = document.createElement('a');
    a.href = shareImageUrl;
    a.download = 'drip-fit-tryon.png';
    a.click();
    trackEvent('tryon_drip_card_downloaded');
  };

  const handleAddToWardrobe = async (item: WhatsLookItem) => {
    if (!authUser) {
      onToast({ title: 'Sign in to save', description: 'Create a free account to build your closet.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    try {
      const imageUrl = item.image_url || clothingPhoto || '';
      if (!imageUrl) { onToast({ title: 'No image available', variant: 'destructive' }); return; }
      
      let finalUrl = imageUrl;
      if (imageUrl.startsWith('data:')) {
        const blob = await fetch(imageUrl).then(r => r.blob());
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const path = `${authUser.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('wardrobe').upload(path, blob, { contentType: blob.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('wardrobe').getPublicUrl(path);
        finalUrl = urlData.publicUrl;
      }

      await supabase.from('clothing_wardrobe').insert({
        user_id: authUser.id,
        image_url: finalUrl,
        category: category || 'clothing',
        product_link: item.url || null,
        brand: item.brand || null,
        retailer: item.brand || null,
      });
      trackEvent('wardrobe_add_from_look', { brand: item.brand, source: 'tryon_look' });
      onToast({ title: 'Added to Closet!', description: `${item.name} saved.` });
    } catch (err: unknown) {
      onToast({ title: 'Save failed', description: (err as Error).message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!addingAccessory) { setAccessoryStepIndex(0); return; }
    const timers = [
      setTimeout(() => setAccessoryStepIndex(1), 3000),
      setTimeout(() => setAccessoryStepIndex(2), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [addingAccessory]);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    if (showResultFullscreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [showResultFullscreen]);

  const handleFileSelect = (setter: (v: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setSelectedAccessoryProduct(null);
    try {
      const compressed = await compressImage(file);
      setter(compressed);
      trackEvent('tryon_clothing_uploaded');
    } catch {
      onToast({ title: 'Image load failed', description: 'Try a different photo.', variant: 'destructive' });
    }
  };

  // Build look items for display
  const displayItems = lookItems.length > 0
    ? lookItems
    : (selectedQuickPick || productLink)
      ? [{
          brand: selectedQuickPick?.brand || (() => { try { return new URL(productLink).hostname.replace('www.', ''); } catch { return 'Product'; } })(),
          name: selectedQuickPick?.name || (() => { try { return new URL(productLink).hostname.replace('www.', ''); } catch { return 'Product'; } })(),
          url: productLink || selectedQuickPick?.product_url || '',
          price_cents: selectedQuickPick?.price_cents,
          image_url: selectedQuickPick?.image_url || null,
        }]
      : [];
  const lookProductUrls = useMemo(
    () => Array.from(new Set(displayItems.map((item) => item.url).filter(Boolean))),
    [displayItems]
  );

  // Show the LATEST item details (last in the list), not the first
  const latestItem = displayItems.length > 0 ? displayItems[displayItems.length - 1] : null;
  const latestMatchesQuickPick = !!(
    latestItem?.url &&
    selectedQuickPick?.product_url &&
    latestItem.url === selectedQuickPick.product_url
  );
  const shopUrl = latestItem?.url || selectedQuickPick?.product_url || productLink;
  const productName = latestItem?.name || selectedQuickPick?.name;
  const productBrand = latestItem?.brand || selectedQuickPick?.brand;
  const productPrice = latestItem?.price_cents ?? selectedQuickPick?.price_cents;
  const isPostSelected = !shared && showPostUI && isPublic;
  const compareBeforeImage = layerHistory.length > 0 ? layerHistory[layerHistory.length - 1] : userPhoto;
  const hasCompareBeforeImage = !!compareBeforeImage;

  return (
    <>
      {/* Success Overlay with Share Nudge */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center px-6">
            <AnimatedCheckmark />
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-[28px] font-bold text-foreground mt-4">Looking good.</motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-[14px] text-muted-foreground mt-1">Saved to your profile</motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="w-full max-w-xs mt-4">
              <ShareNudgeInline resultImage={resultImage} caption={caption} onShareStory={handleShareDripCard} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: showSuccessOverlay ? 1.5 : 0 }}>

        {/* ── Hero Result Image ── */}
        <div className="relative rounded-2xl overflow-hidden border border-primary/20 mb-3 shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.15)]">
          <button
            type="button"
            onClick={() => setShowResultFullscreen(true)}
            className="block w-full cursor-zoom-in"
            aria-label="Open try-on result full screen"
          >
            <AnimatePresence mode="wait">
              {showBeforeAfter && hasCompareBeforeImage ? (
                <motion.div key="before-after" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-0">
                  <div className="relative">
                    <img src={compareBeforeImage!} alt="Before look" className="w-full aspect-[3/4] object-cover rounded-l-xl" />
                    <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-black/60 text-white px-2 py-0.5 rounded-md">Before</span>
                  </div>
                  <div className="relative">
                    <img src={resultImage} alt="Try-on result" className="w-full aspect-[3/4] object-cover rounded-r-xl" />
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-md">Result</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full rounded-2xl overflow-hidden bg-muted">
                  <img src={resultImage} alt="Try-on result" className="block w-full h-auto" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Before/After toggle */}
          {hasCompareBeforeImage && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowBeforeAfter(v => !v); }}
              className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold active:scale-95 transition-transform"
            >
              <ArrowLeftRight className="h-3 w-3" />
              {showBeforeAfter ? 'Full View' : 'Compare'}
            </button>
          )}
        </div>

        {/* ── Product Info Bar ── */}
        {(productName || shopUrl) && (
          <button
            type="button"
            onClick={() => {
              const imgUrl = latestItem?.image_url || selectedQuickPick?.image_url || clothingPhoto || '';
              if (imgUrl) {
                setItemPreview({
                  id: latestMatchesQuickPick ? selectedQuickPick?.id : undefined,
                  image_url: imgUrl,
                  name: productName || 'Product',
                  brand: productBrand || '',
                  price_cents: productPrice,
                  product_url: shopUrl || null,
                  category: category || undefined,
                  fit_profile: latestMatchesQuickPick ? selectedQuickPick?.fit_profile : undefined,
                  fabric_composition: latestMatchesQuickPick ? selectedQuickPick?.fabric_composition : undefined,
                  style_genre: latestMatchesQuickPick ? selectedQuickPick?.style_genre : undefined,
                });
              }
            }}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 mb-3 active:scale-[0.98] transition-transform text-left"
          >
            {(latestItem?.image_url || selectedQuickPick?.image_url || clothingPhoto) && (
              <img src={latestItem?.image_url || selectedQuickPick?.image_url || clothingPhoto!} alt="" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              {productBrand && <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{productBrand}</p>}
              {productName && <p className="text-[11px] font-bold text-foreground truncate">{productName}</p>}
              {productPrice && <p className="text-[12px] font-bold text-primary">${(productPrice / 100).toFixed(0)}</p>}
            </div>
            {shopUrl && (
              <span className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg btn-luxury text-primary-foreground text-[10px] font-bold">
                <ExternalLink className="h-3 w-3" /> Shop
              </span>
            )}
          </button>
        )}

        {/* ── Quick Action Bar ── */}
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {!shared && (
            <button
              onClick={() => { onSetShowPostUI(true); if (!caption) onSetCaption(getCaptionSuggestions(category)[0]); onSetIsPublic(true); }}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border active:scale-[0.96] transition-transform ${isPostSelected ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}
            >
              {isPostSelected ? <Check className="h-4 w-4 text-primary" /> : <MessageSquare className="h-4 w-4 text-primary" />}
              <span className={`text-[10px] font-bold ${isPostSelected ? 'text-primary' : 'text-foreground'}`}>{isPostSelected ? 'Posted' : 'Post'}</span>
            </button>
          )}
          {shared && (
            <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-primary">{isPublic ? 'Posted' : 'Saved'}</span>
            </div>
          )}
          <button
            onClick={handleShareDripCard}
            disabled={sharingDripCard}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-card border border-primary/20 active:scale-[0.96] transition-transform"
          >
            {sharingDripCard ? <Loader2 className="h-4 w-4 text-primary animate-spin" /> : <Share className="h-4 w-4 text-primary" />}
            <span className="text-[10px] font-bold text-primary">Share</span>
          </button>
          <button
            onClick={() => setShowBgSwap(true)}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-card border border-primary/20 active:scale-[0.96] transition-transform"
          >
            <Image className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold text-primary">BG</span>
          </button>
          <button
            onClick={onTryAnother}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-card border border-border active:scale-[0.96] transition-transform"
          >
            <RotateCcw className="h-4 w-4 text-foreground/70" />
            <span className="text-[10px] font-bold text-foreground">New</span>
          </button>
          <button
            onClick={onSaveToItems}
            disabled={savedToItems}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-transform disabled:opacity-70 disabled:cursor-not-allowed ${savedToItems ? 'bg-primary/5 border-primary/20' : 'bg-card border-border active:scale-[0.96]'}`}
          >
            <Bookmark className={`h-4 w-4 ${savedToItems ? 'text-primary fill-primary' : 'text-foreground/70'}`} />
            <span className={`text-[10px] font-bold ${savedToItems ? 'text-primary' : 'text-foreground'}`}>{savedToItems ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {/* Post-try-on scan nudge */}
        {!user?.lastScanDate && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={() => { trackEvent('postscan_tryon_click'); navigate('/capture'); }}
            className="w-full flex items-center gap-3 p-3 mb-3 rounded-xl border border-primary/25 bg-primary/5 active:scale-[0.97] transition-transform"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[12px] font-bold text-foreground">Get Your Perfect Size</p>
              <p className="text-[10px] text-muted-foreground">Quick body scan → know your exact size for this brand</p>
            </div>
            <ChevronRight className="h-4 w-4 text-primary shrink-0" />
          </motion.button>
        )}

        {/* What's In This Look */}
        {displayItems.length > 0 && (
          <WhatsInThisLook items={displayItems} clothingPhotoUrl={clothingPhoto} defaultOpen={showLookItems} variant="detail" onAddToWardrobe={handleAddToWardrobe} />
        )}

        {/* Post UI */}
        <AnimatePresence>
          {showPostUI && !shared && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
              <div className="space-y-2 p-3 bg-card border border-border rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Caption or question</p>
                  <Textarea placeholder="e.g., Should I buy this for work?" value={caption} onChange={e => onSetCaption(e.target.value)} className="rounded-lg resize-none text-sm" rows={2} />
                  {!caption && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {getCaptionSuggestions(category).map(p => (
                        <button key={p} onClick={() => onSetCaption(p)} className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors">{p}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between bg-muted/20 rounded-lg p-2.5 border border-border">
                  <div>
                    <span className="text-[12px] font-semibold text-foreground">Post to Style Check</span>
                    <p className="text-[11px] text-muted-foreground">{isPublic ? 'Visible to the community' : 'Private — only you can see'}</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={(v) => { onSetIsPublic(v); saveSharePreference(v); }} />
                </div>
                <Button className="w-full h-10 rounded-lg btn-luxury text-primary-foreground text-[13px] font-bold tracking-wide" onClick={onShare} disabled={sharing}>
                  {sharing
                    ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…</>
                    : isPublic
                      ? <><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Save & Post</>
                      : <><Save className="mr-1.5 h-3.5 w-3.5" /> Save to Profile</>}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add More Style ── */}
        <div className="mb-3">
          <button onClick={() => { const opening = !showAccessorySection; setShowAccessorySection(opening); if (opening) { setTimeout(() => accessorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250); } }} className="w-full flex items-center justify-center gap-2 btn-luxury text-primary-foreground rounded-xl px-4 h-11 active:scale-[0.97] transition-transform shimmer-sweep">
            <Sparkles className="h-4 w-4" />
            <span className="text-[13px] font-bold uppercase tracking-wide">Add More Style</span>
            {layerHistory.length > 0 && <span className="text-[11px] bg-background/20 px-2 py-0.5 rounded-full">{layerHistory.length} layered</span>}
            {showAccessorySection ? <span className="h-5 w-5 badge-gold-3d rounded-md flex items-center justify-center"><ChevronDown className="h-2.5 w-2.5 text-primary-foreground" /></span> : <span className="h-5 w-5 badge-gold-3d rounded-md flex items-center justify-center"><ChevronRight className="h-2.5 w-2.5 text-primary-foreground" /></span>}
          </button>
          <AnimatePresence>
            {showAccessorySection && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div ref={accessorySectionRef} className="bg-card border border-t-0 border-border rounded-b-xl p-3">
                  <input ref={accessoryPhotoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect(setAccessoryPhoto)} className="hidden" />
                  <input ref={accessoryCameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileSelect(setAccessoryPhoto)} className="hidden" />
                  <p className="text-[12px] text-foreground/70 mb-2">Layer one item at a time — tops, bottoms, shoes, and more</p>

                  {/* ── Brand Search ── */}
                  <div className="mb-2">
                    <BrandFilter
                      gender={accGender === 'all' ? null : accGender}
                      selectedBrand={accBrandFilter}
                      onBrandChange={setAccBrandFilter}
                    />
                  </div>

                  {/* ── Gender Toggle ── */}
                  <div className="flex gap-1.5 mb-2">
                    {GENDER_OPTIONS.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setAccGenderOverride(opt.key)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                          accGender === opt.key
                            ? 'btn-luxury text-primary-foreground'
                            : 'bg-card border border-primary/30 text-foreground'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Filters Button (Browse-style) ── */}
                  <button
                    onClick={() => setAccFiltersOpen(!accFiltersOpen)}
                    className="relative w-full h-10 rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all text-[13px] font-bold mb-2 btn-luxury text-primary-foreground"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {(() => {
                      const count = (accessoryCategory ? 1 : 0) + (accRetailerFilter ? 1 : 0) + (accSort !== 'default' ? 1 : 0) + (accBrandFilter ? 1 : 0) + (accGenreFilter ? 1 : 0) + (accFitFilter ? 1 : 0) + (accGender !== 'all' ? 1 : 0);
                      return count > 0 ? `Filters (${count})` : 'Filters';
                    })()}
                  </button>

                  {/* ── Expandable Filters Panel ── */}
                  <AnimatePresence>
                    {accFiltersOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-2"
                      >
                        <div className="bg-background border border-border rounded-xl p-3 space-y-3">
                          {/* Sort */}
                          <div>
                            <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Sort by</p>
                            <div className="flex flex-wrap gap-1.5">
                              {([
                                { key: 'default' as const, label: 'Recommended' },
                                { key: 'price_asc' as const, label: 'Price: Low → High' },
                                { key: 'price_desc' as const, label: 'Price: High → Low' },
                                { key: 'brand_az' as const, label: 'Brand: A → Z' },
                              ]).map(opt => (
                                <button
                                  key={opt.key}
                                  onClick={() => setAccSort(opt.key)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                    accSort === opt.key
                                      ? 'btn-luxury text-primary-foreground'
                                      : 'bg-card border border-border text-foreground/70'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Category */}
                          <div>
                            <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Category</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                onClick={() => { setAccessoryCategory(null); setShowAllCategories(true); }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                  !accessoryCategory && showAllCategories
                                    ? 'btn-luxury text-primary-foreground'
                                    : 'bg-card border border-border text-foreground/70'
                                }`}
                              >
                                All
                              </button>
                              {[
                                { key: 'accessories', label: 'Accessories' },
                                { key: 'activewear', label: 'Activewear' },
                                { key: 'bags', label: 'Bags' },
                                { key: 'belts', label: 'Belts' },
                                { key: 'blazers', label: 'Blazers' },
                                { key: 'boots', label: 'Boots' },
                                { key: 'bottom', label: 'Bottoms' },
                                { key: 'coats', label: 'Coats' },
                                { key: 'dresses', label: 'Dresses' },
                                { key: 'hats', label: 'Hats' },
                                { key: 'heels', label: 'Heels' },
                                { key: 'hoodies', label: 'Hoodies' },
                                { key: 'jackets', label: 'Jackets' },
                                { key: 'jeans', label: 'Jeans' },
                                { key: 'jewelry', label: 'Jewelry' },
                                { key: 'jumpsuits', label: 'Jumpsuits' },
                                { key: 'leggings', label: 'Leggings' },
                                { key: 'loafers', label: 'Loafers' },
                                { key: 'loungewear', label: 'Loungewear' },
                                { key: 'outerwear', label: 'Outerwear' },
                                { key: 'pants', label: 'Pants' },
                                { key: 'polos', label: 'Polos' },
                                { key: 'sandals', label: 'Sandals' },
                                { key: 'scarves', label: 'Scarves' },
                                { key: 'shirts', label: 'Shirts' },
                                { key: 'shoes', label: 'Shoes' },
                                { key: 'shorts', label: 'Shorts' },
                                { key: 'skirts', label: 'Skirts' },
                                { key: 'sneakers', label: 'Sneakers' },
                                { key: 'sunglasses', label: 'Sunglasses' },
                                { key: 'sweaters', label: 'Sweaters' },
                                { key: 'swimwear', label: 'Swimwear' },
                                { key: 't-shirts', label: 'T-Shirts' },
                                { key: 'tops', label: 'Tops' },
                                
                                { key: 'vests', label: 'Vests' },
                                { key: 'watches', label: 'Watches' },
                              ].filter(cat => isCategoryVisibleForGender(cat.key, accGender)).map(cat => (
                                <button
                                  key={cat.key}
                                  onClick={() => { setAccessoryCategory(cat.key); setShowAllCategories(false); }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                    accessoryCategory === cat.key
                                      ? 'btn-luxury text-primary-foreground'
                                      : 'bg-card border border-border text-foreground/70'
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Retailer — collapsible */}
                          <div>
                            <button onClick={() => setAccRetailerOpen(!accRetailerOpen)} className="flex items-center justify-between w-full">
                              <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                                Retailer {accRetailerFilter ? `· ${accRetailerFilter}` : ''}
                              </p>
                              <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${accRetailerOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {accRetailerOpen && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    <button
                                      onClick={() => setAccRetailerFilter(null)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                        !accRetailerFilter
                                          ? 'btn-luxury text-primary-foreground'
                                          : 'bg-card border border-border text-foreground/70'
                                      }`}
                                    >
                                      All
                                    </button>
                                    {accAvailableRetailers.map(retailer => (
                                      <button
                                        key={retailer}
                                        onClick={() => setAccRetailerFilter(retailer === accRetailerFilter ? null : retailer)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize ${
                                          accRetailerFilter === retailer
                                            ? 'btn-luxury text-primary-foreground'
                                            : 'bg-card border border-border text-foreground/70'
                                        }`}
                                      >
                                        {retailer}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Genre — collapsible */}
                          <div>
                            <button onClick={() => setAccGenreOpen(!accGenreOpen)} className="flex items-center justify-between w-full">
                              <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                                Genre {accGenreFilter ? `· ${accGenreFilter}` : ''}
                              </p>
                              <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${accGenreOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {accGenreOpen && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    <button
                                      onClick={() => setAccGenreFilter(null)}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                        !accGenreFilter ? 'btn-luxury text-primary-foreground' : 'bg-card border border-border text-foreground/70'
                                      }`}
                                    >
                                      All
                                    </button>
                                    {BRAND_GENRES.map(genre => (
                                      <button
                                        key={genre}
                                        onClick={() => setAccGenreFilter(genre === accGenreFilter ? null : genre)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                          accGenreFilter === genre ? 'btn-luxury text-primary-foreground' : 'bg-card border border-border text-foreground/70'
                                        }`}
                                      >
                                        {genre}
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Fit / Cut — collapsible */}
                          {accAvailableFits.length > 0 && accProducts.filter(p => Array.isArray(p.fit_profile) && p.fit_profile.length > 0).length >= 5 && (
                            <div>
                              <button onClick={() => setAccFitOpen(!accFitOpen)} className="flex items-center justify-between w-full">
                                <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                                  Fit / Cut {accFitFilter ? `· ${accFitFilter}` : ''}
                                </p>
                                <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${accFitOpen ? 'rotate-180' : ''}`} />
                              </button>
                              <AnimatePresence>
                                {accFitOpen && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      <button
                                        onClick={() => setAccFitFilter(null)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                          !accFitFilter ? 'btn-luxury text-primary-foreground' : 'bg-card border border-border text-foreground/70'
                                        }`}
                                      >
                                        All
                                      </button>
                                      {accAvailableFits.map(fit => (
                                        <button
                                          key={fit}
                                          onClick={() => setAccFitFilter(fit === accFitFilter ? null : fit)}
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize ${
                                            accFitFilter === fit ? 'btn-luxury text-primary-foreground' : 'bg-card border border-border text-foreground/70'
                                          }`}
                                        >
                                          {fit}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Clear filters */}
                          {(() => {
                            const count = (accessoryCategory ? 1 : 0) + (accRetailerFilter ? 1 : 0) + (accSort !== 'default' ? 1 : 0) + (accBrandFilter ? 1 : 0) + (accGenreFilter ? 1 : 0) + (accFitFilter ? 1 : 0) + (accGender !== 'all' ? 1 : 0);
                            return count > 0 ? (
                              <button
                                onClick={() => { setAccessoryCategory(null); setAccRetailerFilter(null); setAccSort('default'); setAccBrandFilter(null); setAccGenreFilter(null); setAccFitFilter(null); setAccGenderOverride(null); setShowAllCategories(true); }}
                                className="text-[10px] text-primary font-semibold"
                              >
                                Clear all filters
                              </button>
                            ) : null;
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {accessoryPhoto ? (
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/40 shrink-0">
                        <img src={accessoryPhoto} alt="Accessory" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[10px] text-primary font-medium flex items-center gap-1"><Check className="h-3 w-3" /> {accessoryCategory || 'Accessory'} ready</p>
                        <div className="flex gap-1.5">
                          <button onClick={() => { setAccessoryPhoto(null); setAccessoryCategory(null); setSelectedAccessoryProduct(null); }} className="text-[11px] text-primary underline font-medium">Browse</button>
                          <button onClick={() => accessoryPhotoRef.current?.click()} className="text-[11px] text-muted-foreground underline">Gallery</button>
                          <button onClick={() => { setAccessoryPhoto(null); setAccessoryCategory(null); setSelectedAccessoryProduct(null); }} className="text-[11px] text-destructive underline">Remove</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-1.5 mb-2">
                        <button onClick={() => { setSelectedAccessoryProduct(null); if (!accessoryCategory) setAccessoryCategory('shoes'); accessoryCameraRef.current?.click(); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-card border border-border text-foreground/70 active:scale-95 transition-transform">
                          <Camera className="h-3 w-3" /><span className="text-[10px] font-semibold">Camera</span>
                        </button>
                        <button onClick={() => { setSelectedAccessoryProduct(null); if (!accessoryCategory) setAccessoryCategory('shoes'); accessoryPhotoRef.current?.click(); }} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-card border border-border text-foreground/70 active:scale-95 transition-transform">
                          <ImageIcon className="h-3 w-3" /><span className="text-[10px] font-semibold">Gallery</span>
                        </button>
                      </div>
                      {showAllCategories && !accessoryCategory && (
                        <div className="space-y-2 mb-2">
                          {ALL_PRODUCT_CATEGORIES.map(cat => (
                            <CategoryProductGrid key={cat.key} category={cat.key} title={cat.label} collapsed={true} maxItems={1000} showViewAll={true}
                              gender={accEffectiveGender}
                              brand={accBrandFilter ?? undefined}
                              genre={accGenreFilter}
                              retailer={accRetailerFilter ?? undefined}
                              fitProfile={accFitFilter ?? undefined}
                              onSelectProduct={async (product) => {
                                const resolvedCategory = product.category || cat.key;
                                setAccessoryCategory(resolvedCategory);
                                setSelectedAccessoryProduct(product);
                                onSetLookItems(prev => [...prev, {
                                  brand: product.brand,
                                  name: product.name,
                                  url: product.product_url || '',
                                  price_cents: product.price_cents,
                                  image_url: product.image_url,
                                }]);
                                trackEvent('catalog_product_clicked', { brand: product.brand, category: cat.key });
                                try { setAccessoryPhoto(await imageUrlToBase64(product.image_url)); } catch { setAccessoryPhoto(product.image_url); }
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {accessoryCategory && (
                        <div className="mb-2">
                          <CategoryProductGrid category={accessoryCategory} title={`Shop ${accessoryCategory}`} collapsed={false} maxItems={1000}
                            gender={accEffectiveGender}
                            brand={accBrandFilter ?? undefined}
                            genre={accGenreFilter}
                            retailer={accRetailerFilter ?? undefined}
                            fitProfile={accFitFilter ?? undefined}
                            onSelectProduct={async (product) => {
                                setAccessoryCategory(product.category || accessoryCategory);
                                setSelectedAccessoryProduct(product);
                                onSetLookItems(prev => [...prev, {
                                  brand: product.brand,
                                  name: product.name,
                                  url: product.product_url || '',
                                  price_cents: product.price_cents,
                                  image_url: product.image_url,
                                }]);
                              trackEvent('catalog_product_clicked', { brand: product.brand, category: accessoryCategory });
                              try { setAccessoryPhoto(await imageUrlToBase64(product.image_url)); } catch { setAccessoryPhoto(product.image_url); }
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {!addingAccessory && (
                    <Button className="w-full h-10 rounded-lg text-[13px] font-bold tracking-wide btn-luxury text-primary-foreground active:scale-[0.97] transition-transform disabled:opacity-30" onClick={() => { onAddAccessory(accessoryPhoto!, accessoryCategory, selectedAccessoryProduct); setAccessoryPhoto(null); setAccessoryCategory(null); setSelectedAccessoryProduct(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={!accessoryPhoto}>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Add {accessoryCategory ? accessoryCategory.charAt(0).toUpperCase() + accessoryCategory.slice(1) : 'Accessory'}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Fullscreen Portal ── */}
        {showResultFullscreen && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[220] h-dvh w-screen overflow-hidden overscroll-none bg-black/95 flex flex-col"
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setShowResultFullscreen(false);
            }}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setShowResultFullscreen(false)}
              className="absolute right-4 z-[221] h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-black/70 border border-white/25 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
              style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
              aria-label="Close full screen image"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Image — maximized with pinch-to-zoom */}
            <ZoomableResultImage
              src={resultImage}
              brandLabel={productBrand}
            />

            {/* Info + Actions — pinned to bottom */}
            <div className="shrink-0 px-5 pb-6 pt-3 space-y-3" onPointerDown={(e) => e.stopPropagation()}>
              {/* Product info */}
              <div className="text-center">
                {productBrand && <p className="text-[11px] text-white font-extrabold uppercase tracking-wider drop-shadow-sm">{productBrand}</p>}
                {productName && <p className="text-[12px] font-bold text-white mt-0.5 truncate">{productName}</p>}
                {productPrice != null && (
                  <p className="text-sm font-bold text-primary mt-1">${(productPrice / 100).toFixed(0)}</p>
                )}
              </div>

              {/* Wardrobe + Save row */}
              {authUser && (
                <div className="max-w-sm mx-auto w-full flex gap-2">
                  <button
                    onClick={() => {
                      handleAddToWardrobe({
                        brand: productBrand || '',
                        name: productName || 'Try-on item',
                        url: shopUrl || '',
                        price_cents: productPrice,
                        image_url: clothingPhoto,
                      });
                    }}
                    className="flex-1 h-10 rounded-xl text-[11px] font-bold gap-1.5 flex items-center justify-center border border-white/10 text-white/70 hover:bg-white/10 active:scale-95 transition-transform"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    + Wardrobe
                  </button>
                  <button
                    onClick={onSaveToItems}
                    disabled={savedToItems}
                    className={`flex-1 h-10 rounded-xl text-[11px] font-bold gap-1.5 flex items-center justify-center active:scale-95 transition-transform ${
                      savedToItems
                        ? 'border border-primary/40 bg-primary/20 text-primary'
                        : 'border border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    {savedToItems ? 'Saved ✓' : '+ Save'}
                  </button>
                </div>
              )}

              {/* Primary actions */}
              <div className="flex gap-3 max-w-sm mx-auto w-full">
                {shopUrl && (
                  <button
                    onClick={() => { window.open(shopUrl, '_blank', 'noopener'); setShowResultFullscreen(false); }}
                    className="flex-1 gap-2 h-12 rounded-xl font-bold btn-luxury text-primary-foreground flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Buy!
                  </button>
                )}
                <button
                  onClick={() => { handleShareDripCard(); setShowResultFullscreen(false); }}
                  disabled={sharingDripCard}
                  className="flex-1 gap-2 h-12 rounded-xl font-bold flex items-center justify-center border border-white/20 text-white hover:bg-white/10 active:scale-95 transition-transform"
                >
                  {sharingDripCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share className="h-4 w-4" />}
                  Share
                </button>
                <button
                  onClick={() => { onTryAnother(); setShowResultFullscreen(false); }}
                  className="flex-1 gap-2 h-12 rounded-xl font-bold flex items-center justify-center border border-white/20 text-white hover:bg-white/10 active:scale-95 transition-transform"
                >
                  <RotateCcw className="h-4 w-4" />
                  New
                </button>
              </div>
            </div>
          </motion.div>,
          document.body
        )}

        {/* Full-screen loading animation when adding accessories */}
        {addingAccessory && (
          <TryOnLoadingAnimation stepIndex={accessoryStepIndex} />
        )}

        <p className="text-[10px] text-muted-foreground/50 text-center mt-1">We may earn a commission. It doesn't change your price.</p>
      </motion.div>

      {/* Background Swap Overlay — wrapped in ErrorBoundary for WASM safety */}
      <AnimatePresence>
        {showBgSwap && (
          <ErrorBoundary fallback={
            <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center gap-4 p-6">
              <p className="text-sm font-semibold text-foreground">Background swap unavailable</p>
              <p className="text-xs text-muted-foreground text-center">Your browser may not support this feature. Try sharing the original image instead.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowBgSwap(false)} className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground">Close</button>
                <button onClick={() => { setShowBgSwap(false); setTimeout(() => setShowBgSwap(true), 100); }} className="px-4 py-2 rounded-xl btn-luxury text-primary-foreground text-xs font-bold">Retry</button>
              </div>
            </div>
          }>
            <BackgroundSwapOverlay
              resultImageUrl={resultImage}
              userPhotoUrl={userPhoto || undefined}
              clothingPhotoUrl={clothingPhoto || undefined}
              clothingCategory={category || undefined}
              productUrls={lookProductUrls}
              onClose={() => setShowBgSwap(false)}
            />
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {/* DripCard v2 — off-screen render target for html-to-image */}
      {sharingDripCard && (
        <DripCard
          ref={dripCardRef}
          measurements={{}}
          heightCm={0}
          recommendedSize={selectedQuickPick?.name ? 'TRY-ON' : '—'}
          tryOnImageUrl={shareCardImageUrl || resultImage}
          brandMatch={selectedQuickPick ? { brand: selectedQuickPick.brand, size: selectedQuickPick.name, confidence: 0.92 } : null}
          displayName={authUser?.user_metadata?.display_name || null}
        />
      )}

      {/* Share fallback dialog */}
      <Dialog open={shareFallbackOpen} onOpenChange={(open) => { if (!open) { setShareFallbackOpen(false); if (shareImageUrl?.startsWith('blob:')) URL.revokeObjectURL(shareImageUrl); setShareImageUrl(null); } }}>
        <DialogContent className="max-w-[320px] bg-card border-border p-4 rounded-2xl">
          <DialogTitle className="text-foreground text-sm font-bold mb-3 text-center">
            Share Your Fit
          </DialogTitle>
          {shareImageUrl && (
            <div className="w-full rounded-xl overflow-hidden border border-border mb-4" style={{ aspectRatio: '9/16' }}>
              <img src={shareImageUrl} alt="Shareable try-on card" className="w-full h-full object-cover" />
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center mb-3">
            Save the image, then share to Instagram Stories, WhatsApp or anywhere.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleShareDownload} className="w-full h-11 rounded-xl btn-luxury text-primary-foreground font-bold">
              <Download className="mr-2 h-4 w-4" /> Save to Photos
            </Button>
            <Button
              variant="outline"
              onClick={async () => { await navigator.clipboard.writeText('https://dripfitcheck.lovable.app'); onToast({ title: 'Link copied!' }); }}
              className="w-full h-10 rounded-xl border-primary/30 text-primary text-sm font-semibold"
            >
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item detail preview modal */}
      <ProductPreviewModal
        product={itemPreview}
        onClose={() => setItemPreview(null)}
        onTryOn={undefined}
        onShop={(p) => {
          if (p.product_url) {
            beginClickout(p.brand || 'Product', p.product_url);
            window.open(p.product_url, '_blank', 'noopener');
            confirmClickout();
          }
          setItemPreview(null);
        }}
      />
    </>
  );
};

export default TryOnResultSection;
