import { useState } from 'react';
import { X, Plus, Search, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePreferredBrands, MASTER_BRANDS } from '@/hooks/useProductCatalog';
import { useToast } from '@/hooks/use-toast';

const PreferredBrands = () => {
  const { brands, addBrand, removeBrand } = usePreferredBrands();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const filtered = search.length >= 2
    ? MASTER_BRANDS.filter(b => b.toLowerCase().includes(search.toLowerCase()) && !brands.includes(b))
    : [];

  const handleAdd = async (name: string) => {
    const ok = await addBrand(name);
    if (ok) {
      toast({ title: `${name} added` });
      setSearch('');
    }
  };

  const handleCustomAdd = async () => {
    const name = search.trim();
    if (!name || name.length < 2) return;
    const ok = await addBrand(name);
    if (ok) {
      toast({ title: `${name} added` });
      setSearch('');
    }
  };

  return (
    <div>
      {/* Current brands */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {brands.map(b => (
          <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
            {b}
            <button onClick={() => removeBrand(b)} className="hover:text-destructive transition-colors">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {brands.length === 0 && !showSearch && (
          <p className="text-[10px] text-muted-foreground">No preferred brands yet</p>
        )}
      </div>

      {/* Add brand */}
      {showSearch ? (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search or type brand name..."
                className="h-8 text-[11px] pl-7 rounded-lg"
                autoFocus
              />
            </div>
            <button
              onClick={() => { setShowSearch(false); setSearch(''); }}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {filtered.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {filtered.slice(0, 8).map(b => (
                <button
                  key={b}
                  onClick={() => handleAdd(b)}
                  className="px-2 py-1 rounded-md border border-border text-[10px] text-muted-foreground hover:border-primary/30 hover:text-foreground active:scale-95 transition-all"
                >
                  <Plus className="inline h-2.5 w-2.5 mr-0.5" />{b}
                </button>
              ))}
            </div>
          )}
          {search.length >= 2 && filtered.length === 0 && !brands.includes(search.trim()) && (
            <button
              onClick={handleCustomAdd}
              className="w-full flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-primary/30 text-[10px] text-primary font-bold active:scale-95 transition-transform"
            >
              <Plus className="h-3 w-3" /> Add "{search.trim()}" as custom brand
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="flex items-center gap-1 text-[10px] text-primary font-bold active:opacity-70"
        >
          <Plus className="h-3 w-3" /> Add Brand
        </button>
      )}
    </div>
  );
};

export default PreferredBrands;
