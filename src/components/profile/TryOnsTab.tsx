import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquare, ShoppingBag } from 'lucide-react';

interface TryOnPost {
  id: string;
  result_photo_url: string;
  caption: string | null;
  is_public: boolean;
  created_at: string;
  product_url?: string | null;
}

interface TryOnsTabProps {
  tryOnPosts: TryOnPost[];
  loading: boolean;
}

const TryOnsTab = ({ tryOnPosts, loading }: TryOnsTabProps) => {
  const navigate = useNavigate();
  const publicCount = tryOnPosts.filter(p => p.is_public).length;

  return (
    <>
      {/* Stats row */}
      <div className="flex gap-2 mb-4">
        {[
          { label: 'Total', value: tryOnPosts.length },
          { label: 'Public', value: publicCount },
          { label: 'Private', value: tryOnPosts.length - publicCount },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-card border border-border rounded-lg py-2 text-center">
            <p className="text-[16px] font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card animate-pulse">
              <div className="aspect-[3/4] bg-muted rounded-t-xl" />
              <div className="p-2 space-y-1"><div className="h-2 bg-muted rounded w-2/3" /><div className="h-2 bg-muted rounded w-1/3" /></div>
            </div>
          ))}
        </div>
      ) : tryOnPosts.length === 0 ? (
        <div className="text-center py-10">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-6 w-6 text-primary/50" />
          </div>
          <p className="text-[14px] font-bold text-foreground mb-1">No Try-Ons yet</p>
          <p className="text-[12px] text-muted-foreground max-w-[200px] mx-auto mb-4">Upload a photo and a clothing item to see how it looks on you.</p>
          <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/tryon')}>
            <Sparkles className="mr-1.5 h-4 w-4" /> Create Your First Try-On
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {tryOnPosts.map(post => (
              <motion.div key={post.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="rounded-xl overflow-hidden border border-border bg-card">
                  <div className="relative">
                    <img src={post.result_photo_url} alt="Try-on" className="w-full aspect-[3/4] object-cover" />
                    {post.product_url && (
                      <div className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-sm rounded-full p-1">
                        <ShoppingBag className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${post.is_public ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {post.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 h-9 rounded-lg text-[11px]" onClick={() => navigate('/tryon')}>
              <Sparkles className="mr-1 h-3 w-3" /> New Try-On
            </Button>
            <Button variant="outline" className="flex-1 h-9 rounded-lg text-[11px]" onClick={() => navigate('/community')}>
              <MessageSquare className="mr-1 h-3 w-3" /> Fit Check Feed
            </Button>
          </div>
        </>
      )}
    </>
  );
};

export default TryOnsTab;
