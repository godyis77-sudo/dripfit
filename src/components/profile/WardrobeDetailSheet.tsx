import { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ExternalLink, Trash2, X, ShoppingBag, Tag, Calendar, Store, Star, ChevronDown, Search } from 'lucide-react';
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
      <SheetContent side="bottom" className="h-[90dvh] p-0 rounded-t-2xl bg-background border-t border-border">
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Image — maximized */}
        <div className="relative w-full h-[55dvh] bg-black flex items-center justify-center overflow-hidden">
          <img src={item.image_url} alt={item.category} className="max-w-full max-h-full object-contain" />
          {displayRetailer && (
            <div className="absolute bottom-3 right-3 bg-primary rounded-lg px-3 py-1 shadow-lg border border-primary-foreground/20">
              <p className="text-[11px] font-extrabold text-primary-foreground uppercase tracking-wide">{displayRetailer}</p>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="px-4 pt-4 pb-6 space-y-3 overflow-y-auto max-h-[40dvh]">
          {/* Info chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-foreground bg-card border border-border rounded-md px-2 py-1 capitalize">
              <Tag className="h-3 w-3 text-primary" /> {item.category}
            </span>
            {(() => {
              const detected = item.product_link ? detectBrandFromUrl(item.product_link) : null;
              const displayRetailer = detected?.retailer || item.retailer;
              return displayRetailer ? (
                <span className="brand-label-lg">
                  <Store className="h-3 w-3" /> {displayRetailer}
                </span>
              ) : null;
            })()}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-card border border-border rounded-md px-2 py-1">
              <Calendar className="h-3 w-3" /> {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>

          {item.notes && (
            <p className="text-[12px] text-muted-foreground">{item.notes}</p>
          )}

          {/* Try On button */}
          <Button
            className="w-full h-10 rounded-xl text-[12px] font-bold gap-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            onClick={() => {
              trackEvent('tryon_from_wardrobe_detail', { item_id: item.id });
              onOpenChange(false);
              navigate('/tryon', { state: { clothingUrl: item.image_url, productUrl: item.product_link || undefined } });
            }}
          >
            <Sparkles className="h-4 w-4" /> Try On
          </Button>

          {/* Direct product link */}
          {item.product_link && (
            <Button
              className="w-full h-10 rounded-xl text-[12px] font-bold btn-luxury text-primary-foreground gap-1.5"
              onClick={() => {
                trackEvent('shop_clickout', { source: 'wardrobe_detail_direct' });
                window.open(item.product_link!, '_blank', 'noopener');
              }}
            >
              <ExternalLink className="h-4 w-4" /> Buy Now!
            </Button>
          )}

          {/* Retailer accordion */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full h-10 rounded-xl text-[12px] font-bold gap-1.5 justify-between">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Shop Style
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {/* Search field */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search retailers..."
                  value={retailerSearch}
                  onChange={(e) => setRetailerSearch(e.target.value)}
                  className="h-8 pl-8 text-[11px] rounded-lg bg-card border-border"
                />
              </div>

              {/* Suggested retailers (max 4) */}
              <div className="grid grid-cols-2 gap-1.5">
                {suggestions.map(name => (
                  <button
                    key={name}
                    onClick={() => handleShop(name)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/40 active:scale-[0.97] transition-all text-left"
                  >
                    <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-[11px] font-bold text-foreground truncate">{name}</span>
                    {favoriteRetailers.includes(name) && (
                      <Star className="h-2.5 w-2.5 text-primary fill-primary ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Search results */}
              {filteredRetailers.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredRetailers.map(name => (
                    <button
                      key={name}
                      onClick={() => handleShop(name)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/40 active:scale-[0.97] transition-all text-left"
                    >
                      <ExternalLink className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-[11px] font-bold text-foreground truncate">{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Delete */}
          <Button
            variant="outline"
            className="w-full h-9 rounded-xl text-[11px] text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
            onClick={() => { onDelete(item.id); onOpenChange(false); }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove from Wardrobe
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WardrobeDetailSheet;
