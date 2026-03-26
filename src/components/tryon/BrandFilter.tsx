import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, X, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getBrandGenre } from '@/lib/brandGenres';

interface BrandFilterProps {
  gender: string | null;
  selectedBrand: string | null;
  onBrandChange: (brand: string | null) => void;
  /** Multi-select mode */
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

        if (!data || data.length === 0) { hasMore = false; break; }

        for (const row of data) {
          if (!brandGenderMap.has(row.brand)) brandGenderMap.set(row.brand, new Set());
          brandGenderMap.get(row.brand)!.add(row.gender || 'unisex');
        }

        offset += PAGE_SIZE;
        if (data.length < PAGE_SIZE) hasMore = false;
      }

      const filtered: string[] = [];
      for (const [brand, genders] of brandGenderMap) {
        if (gender === 'mens' && genders.size === 1 && genders.has('womens')) continue;
        if (gender === 'womens' && genders.size === 1 && genders.has('mens')) continue;
        filtered.push(brand);
      }

      filtered.sort((a, b) => a.localeCompare(b));
      setAllBrands(filtered);
    } finally {
      setLoading(false);
    }
  }, [gender]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const matchingBrands = search.length >= 1
    ? allBrands.filter(b => b.toLowerCase().includes(search.toLowerCase()))
    : allBrands;

  const handleSelect = (brand: string) => {
    if (multiSelect && onBrandsChange) {
      if (selectedBrands.includes(brand)) {
        onBrandsChange(selectedBrands.filter(b => b !== brand));
      } else {
        onBrandsChange([...selectedBrands, brand]);
      }
      setSearch('');
    } else {
      onBrandChange(brand);
      setSearch('');
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    if (multiSelect && onBrandsChange) {
      onBrandsChange([]);
    } else {
      onBrandChange(null);
    }
    setSearch('');
  };

  const hasSelection = multiSelect ? selectedBrands.length > 0 : !!selectedBrand;

  const renderSearchAndDropdown = () => (
    <div className="relative">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); if (!showDropdown) setShowDropdown(true); }}
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

      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {loading ? (
            <p className="text-[12px] text-muted-foreground text-center py-3">Loading brands...</p>
          ) : matchingBrands.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-3">No brands found</p>
          ) : (
            matchingBrands.map(brand => {
              const genre = getBrandGenre(brand);
              const isSelected = multiSelect ? selectedBrands.includes(brand) : selectedBrand === brand;
              return (
                <button
                  key={brand}
                  onClick={() => handleSelect(brand)}
                  className={`w-full text-left px-3 py-2 text-[13px] hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center justify-between ${isSelected ? 'text-primary font-bold bg-primary/5' : 'text-foreground'}`}
                >
                  <span className="flex items-center gap-1.5">
                    {isSelected && <Check className="h-3 w-3 text-primary" />}
                    {brand}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">{genre}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="mb-3" ref={wrapperRef}>
      <p className="text-[12px] font-bold text-foreground/70 uppercase tracking-wider mb-1.5">
        {multiSelect ? 'Filter by Brand' : 'Sort by Brand'}
      </p>

      {hasSelection ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {multiSelect ? selectedBrands.map(brand => (
              <span key={brand} className="pill pill-active inline-flex items-center gap-1.5">
                {brand}
                <button onClick={() => onBrandsChange?.(selectedBrands.filter(b => b !== brand))} className="hover:text-destructive transition-colors" aria-label={`Remove ${brand}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )) : (
              <span className="pill pill-active inline-flex items-center gap-1.5">
                {selectedBrand}
                <button onClick={handleClear} className="hover:text-destructive transition-colors" aria-label="Clear brand filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {multiSelect && selectedBrands.length > 0 && (
              <button onClick={handleClear} className="text-[10px] text-primary font-semibold">Clear all</button>
            )}
          </div>
          {multiSelect && renderSearchAndDropdown()}
        </div>
      ) : (
        renderSearchAndDropdown()
      )}
    </div>
  );
};

export default BrandFilter;
