import InlineCrown from '@/components/ui/InlineCrown';

interface PremiumBadgeProps {
  label?: string;
  className?: string;
}

const PremiumBadge = ({ label = 'Premium', className = '' }: PremiumBadgeProps) => (
  <span className={`shimmer-sweep inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] text-primary-foreground ${className}`}
    style={{
      background: 'linear-gradient(175deg, hsl(45 100% 88%) 0%, hsl(42 80% 56%) 18%, hsl(40 72% 50%) 50%, hsl(38 68% 42%) 82%, hsl(36 60% 34%) 100%)',
      boxShadow: '0 1px 0 0 hsl(40 55% 30%), 0 2px 0 0 hsl(38 45% 24%), 0 4px 12px -2px hsl(40 70% 20% / 0.5), inset 0 1px 0 hsl(45 100% 92% / 0.6), inset 0 -1px 0 hsl(38 50% 28% / 0.4)',
    }}
  >
    <InlineCrown size={10} className="shimmer-icon" />
    {label}
  </span>
);

export default PremiumBadge;
