import { useCart } from '@/hooks/useCart';

const VOTE_OPTIONS = [
  { key: 'buy_yes', label: 'COP', emoji: '🔥' },
  { key: 'buy_no', label: 'DROP', emoji: '👎' },
  { key: 'keep_shopping', label: 'Add to Cart', emoji: '🛒' },
] as const;

interface VotePanelProps {
  postId: string;
  votes: Record<string, string[]>;
  voteCounts: Record<string, Record<string, number>>;
  onVote: (postId: string, key: string) => void;
}

const VotePanel = ({ postId, votes, voteCounts, onVote }: VotePanelProps) => {
  const { isInCart } = useCart();

  const buyYes = voteCounts[postId]?.buy_yes ?? 0;
  const buyNo = voteCounts[postId]?.buy_no ?? 0;
  const totalBuy = buyYes + buyNo;
  const buyPct = totalBuy > 0 ? Math.round((buyYes / totalBuy) * 100) : 0;

  return (
    <>
      {/* Outcome summary */}
      {totalBuy > 0 && (
        <div className="text-center">
          <p className="text-[16px] font-bold text-white">{buyPct}% COP</p>
          <p className="text-[11px] text-white/50">{totalBuy} vote{totalBuy !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Would you buy it? */}
      <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider">COP or DROP?</p>
      <div className="flex gap-2">
        {VOTE_OPTIONS.map(v => {
          const active = v.key === 'keep_shopping'
            ? isInCart(postId)
            : (votes[postId] || []).includes(v.key);
          return (
            <button
              key={v.key}
              onClick={() => onVote(postId, v.key)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 flex flex-col items-center gap-0.5 ${
                active ? 'btn-gold-3d border-transparent text-primary-foreground' : 'border-border text-muted-foreground'
              }`}
            >
              <div>
                <span className="mr-1">{v.emoji}</span>
                <span className="text-[11px]">{v.label}</span>
              </div>
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {voteCounts[postId]?.[v.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default VotePanel;
export { VOTE_OPTIONS };
