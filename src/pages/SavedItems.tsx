import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bookmark, ExternalLink, Trash2, ShoppingBag, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import BottomTabBar from '@/components/BottomTabBar';

interface SavedItem {
  id: string;
  product_link: string | null;
  retailer: string | null;
  brand: string | null;
  category: string | null;
  size_recommendation: string | null;
  confidence: string | null;
  created_at: string;
}

const SavedItems = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    if (!user) { setLoading(false); return; }
    const query = supabase.from('saved_items').select('*').eq('user_id', user.id);
    
    const { data } = await query.order('created_at', { ascending: false });
    setItems((data as SavedItem[]) || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('saved_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    trackEvent('saved_item_removed');
    toast({ title: 'Removed' });
  };

  const handleShop = (item: SavedItem) => {
    trackEvent('shop_clickout', { retailer: item.retailer || '' });
    if (item.product_link) {
      window.open(item.product_link, '_blank', 'noopener');
    } else {
      toast({ title: 'No link saved', description: 'Add a product link to shop directly.' });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
              <Bookmark className="h-4 w-4 text-primary" /> Saved for Later
            </h1>
            <p className="text-[10px] text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-card border border-border rounded-xl skeleton-gold" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Bookmark className="h-6 w-6 text-primary/50" />
            </div>
            <p className="text-[14px] font-bold text-foreground mb-1">No saved items</p>
            <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">
              Save items from your Results to keep track of what you want to buy.
            </p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/capture')}>
              Start a Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {item.retailer && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                          {item.retailer}
                        </span>
                      )}
                      {item.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground capitalize">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[13px] font-bold text-foreground">Size {item.size_recommendation}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{item.confidence} confidence</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Saved {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button
                  className="w-full h-8 rounded-lg btn-luxury text-primary-foreground text-[10px] font-bold mt-2"
                  onClick={() => handleShop(item)}
                >
                  <ShoppingBag className="mr-1 h-3 w-3" /> Shop Now
                  {item.product_link && <ExternalLink className="ml-1 h-2.5 w-2.5" />}
                </Button>
              </div>
            ))}

            <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
              We may earn a commission. It doesn't change your price.
            </p>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1 mt-4">
          <Shield className="h-3 w-3" /> Private by default · delete anytime
        </p>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default SavedItems;
