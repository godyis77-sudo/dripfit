import { useState } from 'react';
import { Star, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ALL_RETAILERS = [
  'Zara', 'H&M', 'Uniqlo', 'Gap', 'ASOS', 'Mango', 'Nike', 'Adidas',
  'Nordstrom', 'Revolve', 'Fashion Nova', 'SHEIN', 'Lululemon',
  'Amazon Fashion', 'PrettyLittleThing', 'Abercrombie & Fitch',
  'Urban Outfitters', 'Forever 21', 'J.Crew', 'Banana Republic',
  'Old Navy', 'Puma', 'Boohoo', 'Target',
];

interface FavoriteRetailersProps {
  userId: string;
  favorites: string[];
  onFavoritesChange: (favorites: string[]) => void;
}

const FavoriteRetailers = ({ userId, favorites, onFavoritesChange }: FavoriteRetailersProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const toggleRetailer = async (name: string) => {
    setLoading(name);
    const isFav = favorites.includes(name);

    if (isFav) {
      const { error } = await supabase
        .from('user_favorite_retailers')
        .delete()
        .eq('user_id', userId)
        .eq('retailer_name', name);
      if (!error) {
        onFavoritesChange(favorites.filter(f => f !== name));
      }
    } else {
      const { error } = await supabase
        .from('user_favorite_retailers')
        .insert({ user_id: userId, retailer_name: name });
      if (!error) {
        onFavoritesChange([...favorites, name]);
      } else if (error.code === '23505') {
        onFavoritesChange([...favorites, name]);
      } else {
        toast({ title: 'Error', description: 'Could not save retailer.', variant: 'destructive' });
      }
    }
    setLoading(null);
  };

  return (
    <div>
      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {favorites.map(name => (
            <button
              key={name}
              onClick={() => toggleRetailer(name)}
              disabled={loading === name}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-[10px] font-bold text-primary active:scale-95 transition-all"
            >
              <Star className="h-2.5 w-2.5 fill-primary" />
              {name}
              <X className="h-2.5 w-2.5 ml-0.5 text-primary/60" />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {ALL_RETAILERS.filter(r => !favorites.includes(r)).map(name => (
          <button
            key={name}
            onClick={() => toggleRetailer(name)}
            disabled={loading === name}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-[10px] font-semibold text-muted-foreground hover:border-primary/40 active:scale-95 transition-all"
          >
            <Plus className="h-2.5 w-2.5" />
            {name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FavoriteRetailers;
