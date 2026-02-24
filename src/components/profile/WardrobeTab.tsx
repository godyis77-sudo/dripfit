import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Shirt, Trash2, Sparkles } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface WardrobeItem {
  id: string;
  image_url: string;
  category: string;
  product_link: string | null;
  retailer: string | null;
  created_at: string;
}

interface WardrobeTabProps {
  wardrobeItems: WardrobeItem[];
  onDeleteItem: (id: string) => void;
}

const WardrobeTab = ({ wardrobeItems, onDeleteItem }: WardrobeTabProps) => {
  const navigate = useNavigate();

  return (
    <>
      <p className="text-[11px] text-muted-foreground mb-3">Your saved clothing and potential buys.</p>
      {wardrobeItems.length === 0 ? (
        <div className="text-center py-8">
          <div className="relative mx-auto w-32 h-36 mb-4">
            <div className="absolute inset-x-2 top-0 h-1.5 rounded-full bg-muted" />
            <div className="absolute left-4 top-1.5 w-0.5 h-8 bg-muted" />
            <div className="absolute right-4 top-1.5 w-0.5 h-8 bg-muted" />
            <div className="absolute inset-x-0 top-10 bottom-0 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1">
              <Shirt className="h-8 w-8 text-muted-foreground/20" />
              <div className="flex gap-1">
                <div className="w-1.5 h-6 rounded-full bg-primary/10" />
                <div className="w-1.5 h-8 rounded-full bg-primary/15" />
                <div className="w-1.5 h-5 rounded-full bg-primary/10" />
                <div className="w-1.5 h-7 rounded-full bg-primary/12" />
              </div>
            </div>
          </div>
          <p className="text-[15px] font-bold text-foreground mb-1">Your dream closet starts here</p>
          <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">Save clothing from Try-On sessions to build your personal wardrobe.</p>
          <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/tryon')}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Start Try-On
          </Button>
        </div>
      ) : (
        <div className="columns-2 gap-2 space-y-2">
          {wardrobeItems.map(item => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="break-inside-avoid">
              <div className="rounded-xl overflow-hidden border border-border bg-card">
                <img src={item.image_url} alt="Clothing" className="w-full object-cover" />
                <div className="p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground capitalize">{item.category}</span>
                    {item.retailer && <span className="text-[9px] text-primary font-bold uppercase">{item.retailer}</span>}
                  </div>
                  <p className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                  <div className="flex gap-1">
                    {item.product_link && (
                      <button
                        onClick={() => { trackEvent('shop_clickout', { source: 'wardrobe' }); window.open(item.product_link!, '_blank', 'noopener'); }}
                        className="flex-1 text-[9px] font-bold py-1 rounded-md bg-primary/10 text-primary active:scale-95 transition-transform"
                      >
                        Shop
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="text-[9px] text-muted-foreground py-1 px-2 rounded-md border border-border active:scale-95 transition-transform"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
};

export default WardrobeTab;
