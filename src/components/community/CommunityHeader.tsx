import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, Sparkles } from 'lucide-react';

interface CommunityHeaderProps {
  cartCount: number;
  onPostLook: () => void;
}

const CommunityHeader = ({ cartCount, onPostLook }: CommunityHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="type-headline text-lg text-primary">THE DROP</h1>
          <p className="type-tagline" style={{ fontSize: 11 }}>The community verdict.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => navigate('/cart')}
          className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cart"
        >
          <ShoppingCart className="h-4 w-4" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
        <Button className="rounded-lg btn-glass text-white/80 h-8 px-3 text-[11px] font-bold active:scale-95 transition-transform" onClick={onPostLook} aria-label="Create new post">
          <Sparkles className="mr-1 h-3 w-3 text-primary" /> Post a Look
        </Button>
      </div>
    </div>
  );
};

export default CommunityHeader;
