import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, X, ShoppingBag, Tag, Calendar, Store } from 'lucide-react';
import { buildRetailerSearchUrl, getRetailersForCategory } from '@/lib/retailerLinks';
import { trackEvent } from '@/lib/analytics';

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
}

const WardrobeDetailSheet = ({ item, open, onOpenChange, onDelete }: WardrobeDetailSheetProps) => {
  if (!item) return null;

  const searchQuery = [item.brand, item.category].filter(Boolean).join(' ');
  const suggestedRetailers = getRetailersForCategory(item.category);

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
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Image */}
        <div className="relative w-full h-[50dvh] bg-black flex items-center justify-center overflow-hidden">
          <img src={item.image_url} alt={item.category} className="w-full h-full object-contain" />
          {item.retailer && (
            <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm rounded-full px-2.5 py-1">
              <p className="text-[10px] font-bold text-primary-foreground uppercase">{item.retailer}</p>
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
            {item.brand && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-foreground bg-card border border-border rounded-md px-2 py-1">
                <Store className="h-3 w-3 text-primary" /> {item.brand}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-card border border-border rounded-md px-2 py-1">
              <Calendar className="h-3 w-3" /> {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>

          {item.notes && (
            <p className="text-[12px] text-muted-foreground">{item.notes}</p>
          )}

          {/* Direct product link */}
          {item.product_link && (
            <Button
              className="w-full h-10 rounded-xl text-[12px] font-bold btn-luxury text-primary-foreground gap-1.5"
              onClick={() => {
                trackEvent('shop_clickout', { source: 'wardrobe_detail_direct' });
                window.open(item.product_link!, '_blank', 'noopener');
              }}
            >
              <ExternalLink className="h-4 w-4" /> Shop Direct Link
            </Button>
          )}

          {/* Retailer grid */}
          <div>
            <p className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Shop at Retailers
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {suggestedRetailers.map(name => (
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
          </div>

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
