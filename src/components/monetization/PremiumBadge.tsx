import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  label?: string;
  className?: string;
}

const PremiumBadge = ({ label = 'Premium', className = '' }: PremiumBadgeProps) => (
  <span className={`shimmer-sweep inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-[0.15em] gradient-drip text-primary-foreground shadow-gold-glow ${className}`}>
    <Crown className="h-2.5 w-2.5 shimmer-icon" />
    {label}
  </span>
);

export default PremiumBadge;
