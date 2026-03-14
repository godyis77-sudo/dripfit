import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, TrendingUp, MessageSquare } from 'lucide-react';
import FeatureIcon from '@/components/ui/FeatureIcon';

const PROMPTS = [
  'Should I buy this for work?',
  'Date night — yes or no?',
  'Would you wear this?',
  'Too bold or just right?',
  'Casual Friday vibes?',
  'Wedding guest — yay or nay?',
];
const getPrompt = (idx: number) => PROMPTS[idx % PROMPTS.length];

interface TrendingFit {
  id: string;
  image_url: string;
  caption: string | null;
  username: string;
  like_count: number;
  isLive?: boolean;
}

interface TrendingFitsGridProps {
  fits: TrendingFit[];
}

const TrendingFitsGrid = ({ fits }: TrendingFitsGridProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-6"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary shimmer-icon" />
          <p className="section-label mb-0">Trending Fits</p>
        </div>
        <button
          onClick={() => navigate('/style-check')}
          className="text-[10px] text-primary font-semibold min-h-[44px] flex items-center"
        >
          See all
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {fits.slice(0, 6).map((fit, idx) => {
          const question = fit.caption || getPrompt(idx);
          return (
            <button
              key={fit.id}
              onClick={() => navigate('/style-check')}
              className="relative glass-card rounded-xl overflow-hidden aspect-[3/4] group active:scale-[0.97] active:translate-y-[1px] transition-all shadow-3d active:shadow-3d-pressed"
            >
              <img
                src={fit.image_url}
                alt={fit.caption || 'Trending fit'}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20" />
              <div className="absolute inset-x-0 bottom-6 px-1.5">
                <p className="text-white font-bold text-[11px] leading-tight line-clamp-2">
                  {question.endsWith('?') && (
                    <MessageSquare className="inline h-2.5 w-2.5 mr-0.5 opacity-50 -mt-0.5" />
                  )}
                  {question}
                </p>
              </div>
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 icon-3d px-1.5 py-0.5 !rounded-lg">
                <Heart className="h-2.5 w-2.5 text-background shimmer-icon" />
                <span className="text-[11px] font-bold text-background">{fit.like_count}</span>
              </div>
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[10px] font-bold text-primary-foreground badge-gold-3d px-1.5 py-0.5 !rounded-lg">{fit.username}</span>
              </div>
            </button>
          );
        })}
        {fits.filter(f => f.isLive).length < 3 &&
          Array.from({ length: Math.max(0, Math.min(1, 3 - fits.filter(f => f.isLive).length)) }).map((_, i) => (
            <button
              key={`placeholder-${i}`}
              onClick={() => navigate('/tryon')}
              className="relative glass-card rounded-xl overflow-hidden aspect-[3/4] flex flex-col items-center justify-center gap-2 active:scale-[0.97] active:translate-y-[1px] transition-all shadow-3d active:shadow-3d-pressed border-dashed"
            >
              <FeatureIcon name="post" size={40} />
              <p className="text-[10px] font-medium text-muted-foreground text-center px-2">Be first to post a look</p>
            </button>
          ))}
      </div>
    </motion.div>
  );
};

export default TrendingFitsGrid;
