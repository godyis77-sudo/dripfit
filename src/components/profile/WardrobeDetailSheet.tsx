import { useState, useMemo } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ExternalLink, Trash2, X, ShoppingBag, Tag, Calendar, Store, Star, ChevronDown, Search, Sparkles } from 'lucide-react';
import { buildRetailerSearchUrl, getRetailersForCategory } from '@/lib/retailerLinks';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { trackEvent } from '@/lib/analytics';
import { useNavigate } from 'react-router-dom';

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  product_link: string | null;
  retailer: string | null;
  brand: string | null;
  notes: string | null;
  created_at: string;
}

interface WardrobeDetailSheetProps {
  item: WardrobeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  favoriteRetailers?: string[];
}

const ALL_RETAILERS = [
  'Zara', 'H&M', 'Uniqlo', 'Gap', 'ASOS', 'Mango', 'Nike', 'Adidas',
  'Nordstrom', 'Revolve', 'Fashion Nova', 'SHEIN', 'Lululemon', 'Amazon Fashion',
  'PrettyLittleThing', 'Abercrombie & Fitch', 'Urban Outfitters', 'Forever 21',
  'J.Crew', 'Banana Republic', 'Old Navy', 'Puma', 'Boohoo', 'Target',
  'Fabletics', 'Kith', 'Reformation', 'Gymshark', 'Alo Yoga', 'Everlane',
  'COS', 'AllSaints', 'Free People', 'Vuori', 'SKIMS', 'Aritzia',
  'Carhartt', 'Vans', 'Converse', 'Dr. Martens', 'Birkenstock', 'On',
  'HOKA', 'Anthropologie',
];

const WardrobeDetailSheet = ({ item, open, onOpenChange, onDelete, favoriteRetailers = [] }: WardrobeDetailSheetProps) => {
  const navigate = useNavigate();
  const [retailerSearch, setRetailerSearch] = useState('');

  const searchQuery = item?.category ?? '';
  const categoryRetailers = getRetailersForCategory(item?.category ?? 'top');

  const suggestions = [
    ...favoriteRetailers,
    ...categoryRetailers.filter(r => !favoriteRetailers.includes(r)),
  ].slice(0, 4);

  const filteredRetailers = useMemo(() => {
    if (!retailerSearch.trim()) return [];
    const term = retailerSearch.toLowerCase();
    return ALL_RETAILERS.filter(
      r => r.toLowerCase().includes(term) && !suggestions.includes(r)
    );
  }, [retailerSearch, suggestions]);

  if (!item) return null;

  const displayRetailer = item.brand || (item.product_link ? detectBrandFromUrl(item.product_link).brand : null) || item.retailer;

  const handleShop = (retailerName: string) => {
    trackEvent('shop_clickout', { source: 'wardrobe_detail', retailer: retailerName });
    const url = buildRetailerSearchUrl(retailerName, '', searchQuery);
    window.open(url, '_blank', 'noopener');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90dvh] p-0 rounded-t-2xl glass-dark border-t border-white/10">
        {/* Close */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full bg-white/5 backdrop-blur border border-white/10 flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-white/70" />
        </button>

        {/* Date */}
        <div className="px-4 pt-3 pb-1.5">
          <p className="text-[10px] text-white/25">{new Date(item.created_at).toLocaleDateString()}</p>
        </div>

        {/* Image */}
        <div className="relative w-full h-[55dvh] overflow-hidden px-2 pt-1">
          <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
            <img src={item.image_url} alt={item.category} className="max-w-full max-h-full w-auto h-auto rounded-xl" />
            {displayRetailer && (
              <div className="absolute bottom-3 right-3">
                <span className="bg-black/50 backdrop-blur-sm border border-white/8 text-[9px] tracking-[0.15em] uppercase text-white/50 px-3 py-1 rounded-full font-bold">{displayRetailer}</span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="px-4 pt-4 pb-6 space-y-3 overflow-y-auto max-h-[40dvh]">
          {/* Info chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1 capitalize text-white/70">
              <Tag className="h-3 w-3 text-primary" /> {item.category}
            </span>
            {(() => {
              const detected = item.product_link ? detectBrandFromUrl(item.product_link) : null;
              const displayRetailer = detected?.retailer || item.retailer;
              return displayRetailer ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1 text-white/70">
                  <Store className="h-3 w-3" /> {displayRetailer}
                </span>
              ) : null;
            })()}
          </div>

          {item.notes && (
            <p className="text-[12px] text-white/50">{item.notes}</p>
          )}

          {/* Try-On + Buy Now row */}
          <div className="flex gap-2">
            <Button
              className="flex-1 h-9 rounded-xl text-[11px] font-bold gap-1 glass-gold text-primary border border-primary/20 tracking-wide"
              onClick={() => {
                trackEvent('tryon_from_wardrobe_detail', { item_id: item.id });
                onOpenChange(false);
                navigate('/tryon', { state: { clothingUrl: item.image_url, productUrl: item.product_link || undefined } });
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Try-On
            </Button>
            {item.product_link && (
              <Button
                className="flex-1 h-9 rounded-xl text-[11px] font-bold btn-luxury text-primary-foreground gap-1"
                onClick={() => {
                  trackEvent('shop_clickout', { source: 'wardrobe_detail_direct' });
                  window.open(item.product_link!, '_blank', 'noopener');
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Buy Now!
              </Button>
            )}
          </div>

          {/* Retailer accordion */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full h-9 rounded-xl text-[11px] font-bold gap-1 justify-center glass-gold text-primary border-primary/20 tracking-wide">
                <ShoppingBag className="h-3.5 w-3.5" /> Shop Similar Style
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <Input
                  placeholder="Search retailers..."
                  value={retailerSearch}
                  onChange={(e) => setRetailerSearch(e.target.value)}
                  className="h-8 pl-8 text-[11px] rounded-lg bg-transparent border-b border-white/15 border-t-0 border-l-0 border-r-0 rounded-none placeholder:text-white/25"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {suggestions.map(name => (
                  <button
                    key={name}
                    onClick={() => handleShop(name)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg glass hover:border-primary/20 active:scale-[0.97] transition-all text-left"
                  >
                    <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-[11px] font-bold text-white/70 truncate">{name}</span>
                    {favoriteRetailers.includes(name) && (
                      <Star className="h-2.5 w-2.5 text-primary fill-primary ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {filteredRetailers.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredRetailers.map(name => (
                    <button
                      key={name}
                      onClick={() => handleShop(name)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg glass hover:border-primary/20 active:scale-[0.97] transition-all text-left"
                    >
                      <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-[11px] font-bold text-white/70 truncate">{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-9 rounded-xl text-[11px] bg-white/5 border border-white/10 text-destructive hover:bg-white/10 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove from Wardrobe
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[320px] rounded-2xl glass-dark border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[15px] text-white">Remove from wardrobe?</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] text-white/50">This item will be removed from your wardrobe. You can always add it back later.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl text-[12px] glass text-white/60">Cancel</AlertDialogCancel>
                <AlertDialogAction className="rounded-xl text-[12px] bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { onDelete(item.id); onOpenChange(false); }}>Remove</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WardrobeDetailSheet;
