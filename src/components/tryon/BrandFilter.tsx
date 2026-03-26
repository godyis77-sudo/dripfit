import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getBrandGenre } from '@/lib/brandGenres';

interface BrandFilterProps {
  gender: string | null; // 'mens' | 'womens' | null
  selectedBrand: string | null;
  onBrandChange: (brand: string | null) => void;
  selectedBrands?: string[];
  onBrandsChange?: (brands: string[]) => void;
  multiSelect?: boolean;
}

const BrandFilter = ({ gender, selectedBrand, onBrandChange, selectedBrands = [], onBrandsChange, multiSelect = false }: BrandFilterProps) => {
  const [search, setSearch] = useState('');
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch distinct brands using paginated approach to avoid 1000-row limit
  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const brandGenderMap = new Map<string, Set<string>>();
      const PAGE_SIZE = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data } = await supabase
          .from('product_catalog')
          .select('brand, gender')
          .eq('is_active', true)
          .range(offset, offset + PAGE_SIZE - 1);

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of data) {
          if (!brandGenderMap.has(row.brand)) {
            brandGenderMap.set(row.brand, new Set());
          }
          brandGenderMap.get(row.brand)!.add(row.gender || 'unisex');
        }

        offset += PAGE_SIZE;
        if (data.length < PAGE_SIZE) hasMore = false;
      }

      const filtered: string[] = [];
      for (const [brand, genders] of brandGenderMap) {
        if (gender === 'mens') {
          if (genders.size === 1 && genders.has('womens')) continue;
        } else if (gender === 'womens') {
          if (genders.size === 1 && genders.has('mens')) continue;
        }
        filtered.push(brand);
      }

      filtered.sort((a, b) => a.localeCompare(b));
      setAllBrands(filtered);
    } finally {
      setLoading(false);
    }
  }, [gender]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const matchingBrands = search.length >= 1
    ? allBrands.filter(b => b.toLowerCase().includes(search.toLowerCase()))
    : allBrands;

  const handleSelect = (brand: string) => {
    onBrandChange(brand);
    setSearch('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    onBrandChange(null);
    setSearch('');
  };

  return (
    <div className="mb-3" ref={wrapperRef}>
      <p className="text-[12px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">
        Sort by Brand
      </p>

      {/* Selected brand pill */}
      {selectedBrand ? (
        <div className="flex items-center gap-1.5">
          <span className="pill pill-active inline-flex items-center gap-1.5">
            {selectedBrand}
            <button onClick={handleClear} className="hover:text-destructive transition-colors" aria-label="Clear brand filter">
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      ) : (
        <div className="relative">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
              <Input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  if (!showDropdown) setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search brand name..."
                className="h-7 text-[13px] pl-8 pr-3 rounded-lg"
              />
            </div>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="h-7 w-7 rounded-xl badge-gold-3d active:scale-95 flex items-center justify-center"
            >
              {showDropdown ? <ChevronUp className="h-3.5 w-3.5 text-primary-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-primary-foreground" />}
            </button>
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
              {loading ? (
                <p className="text-[12px] text-muted-foreground text-center py-3">Loading brands...</p>
              ) : matchingBrands.length === 0 ? (
                <p className="text-[12px] text-muted-foreground text-center py-3">No brands found</p>
              ) : (
                matchingBrands.map(brand => {
                  const genre = getBrandGenre(brand);
                  return (
                    <button
                      key={brand}
                      onClick={() => handleSelect(brand)}
                      className="w-full text-left px-3 py-2 text-[13px] text-foreground hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
                    >
                      <span>{brand}</span>
                      <span className="text-[10px] text-muted-foreground/60">{genre}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandFilter;
