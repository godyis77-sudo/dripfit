import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import BrandFilter from '@/components/tryon/BrandFilter';
import { BRAND_GENRES } from '@/lib/brandGenres';
import type { BrandGenre } from '@/lib/brandGenres';
import type { GenderKey } from './community-types';

const SHOP_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'accessories', label: 'Accessories' }, { key: 'activewear', label: 'Activewear' },
  { key: 'bags', label: 'Bags' }, { key: 'belts', label: 'Belts' }, { key: 'blazers', label: 'Blazers' },
  { key: 'boots', label: 'Boots' }, { key: 'bottom', label: 'Bottoms' }, { key: 'coats', label: 'Coats' },
  { key: 'dresses', label: 'Dresses' }, { key: 'hats', label: 'Hats' }, { key: 'heels', label: 'Heels' },
  { key: 'hoodies', label: 'Hoodies' }, { key: 'jackets', label: 'Jackets' }, { key: 'jeans', label: 'Jeans' },
  { key: 'jewelry', label: 'Jewelry' }, { key: 'jumpsuits', label: 'Jumpsuits' }, { key: 'leggings', label: 'Leggings' },
  { key: 'loafers', label: 'Loafers' }, { key: 'outerwear', label: 'Outerwear' }, { key: 'pants', label: 'Pants' },
  { key: 'polos', label: 'Polos' }, { key: 'sandals', label: 'Sandals' }, { key: 'shirts', label: 'Shirts' },
  { key: 'shoes', label: 'Shoes' }, { key: 'shorts', label: 'Shorts' }, { key: 'skirts', label: 'Skirts' },
  { key: 'sneakers', label: 'Sneakers' }, { key: 'sweaters', label: 'Sweaters' }, { key: 'swimwear', label: 'Swimwear' },
  { key: 't-shirts', label: 'T-Shirts' }, { key: 'tops', label: 'Tops' }, { key: 'vests', label: 'Vests' },
];

const SORT_OPTIONS = [
  { key: 'default', label: 'Recommended' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'brand_az', label: 'Brand: A → Z' },
  { key: 'genre', label: 'Genre' },
] as const;

export type SortKey = typeof SORT_OPTIONS[number]['key'];

const FIT_OPTIONS = [
  'athletic fit', 'boxy', 'classic fit', 'cropped', 'drop shoulder',
  'heavyweight', 'lightweight', 'loose fit', 'oversized', 'regular fit',
  'relaxed fit', 'skinny fit', 'slim fit', 'tapered',
] as const;

interface ShopFiltersPanelProps {
  shopCategory: string;
  shopBrand: string | null;
  shopGender: GenderKey;
  shopGenre: BrandGenre | null;
  shopRetailer: string | null;
  shopSort: SortKey;
  availableRetailers: string[];
  availableFits: string[];
  onCategoryChange: (c: string) => void;
  onBrandChange: (b: string | null) => void;
  onGenderChange: (g: GenderKey) => void;
  onGenreChange: (g: BrandGenre | null) => void;
  onRetailerChange: (r: string | null) => void;
  onSortChange: (s: SortKey) => void;
  onClearAll: () => void;
}

const ShopFiltersPanel = ({
  shopCategory, shopBrand, shopGender, shopGenre, shopRetailer, shopSort,
  availableRetailers, availableFits,
  onCategoryChange, onBrandChange, onGenderChange, onGenreChange, onRetailerChange, onSortChange, onClearAll,
}: ShopFiltersPanelProps) => {
  const [open, setOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [fitOpen, setFitOpen] = useState(false);

  const activeCount = (shopBrand ? 1 : 0) + (shopGenre ? 1 : 0) + (shopRetailer ? 1 : 0) + (shopGender !== 'all' ? 1 : 0) + (shopCategory !== 'tops' ? 1 : 0) + (shopSort !== 'default' ? 1 : 0);

  return (
    <>
      <div className="mb-3">
        <button
          onClick={() => setOpen(!open)}
          className="relative w-full h-10 rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all text-base font-bold btn-luxury text-primary-foreground"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border border-border rounded-xl bg-card mb-3"
          >
            <div className="px-4 py-3 space-y-3">
              {/* Sort */}
              <div>
                <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Sort by</p>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => onSortChange(opt.key)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${shopSort === opt.key ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Category</p>
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                  {SHOP_CATEGORIES.map(cat => (
                    <button key={cat.key} onClick={() => onCategoryChange(cat.key)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${shopCategory === cat.key ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>{cat.label}</button>
                  ))}
                </div>
              </div>

              {/* Brand */}
              <div>
                <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Brand</p>
                <BrandFilter gender={shopGender === 'all' ? null : shopGender} selectedBrand={shopBrand} onBrandChange={onBrandChange} />
              </div>

              {/* Retailer */}
              <div>
                <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Retailer</p>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                  <button onClick={() => onRetailerChange(null)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${!shopRetailer ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>All</button>
                  {availableRetailers.map(retailer => (
                    <button key={retailer} onClick={() => onRetailerChange(retailer === shopRetailer ? null : retailer)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize ${shopRetailer === retailer ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>{retailer}</button>
                  ))}
                </div>
              </div>

              {/* Genre */}
              <div>
                <button onClick={() => setGenreOpen(!genreOpen)} className="flex items-center justify-between w-full">
                  <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">Genre {shopGenre ? `· ${shopGenre}` : ''}</p>
                  <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${genreOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {genreOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <button onClick={() => onGenreChange(null)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${!shopGenre ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>All</button>
                        {BRAND_GENRES.map(genre => (
                          <button key={genre} onClick={() => onGenreChange(genre === shopGenre ? null : genre)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${shopGenre === genre ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>{genre}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fit */}
              {availableFits.length > 0 && (
                <div>
                  <button onClick={() => setFitOpen(!fitOpen)} className="flex items-center justify-between w-full">
                    <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">Fit / Cut</p>
                    <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${fitOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {fitOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {availableFits.map(fit => (
                            <button key={fit} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize bg-background border border-border text-foreground/70">{fit}</button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Clear */}
              {activeCount > 0 && (
                <button onClick={onClearAll} className="text-[10px] text-primary font-semibold">Clear all filters</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ShopFiltersPanel;
