import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  label?: string;
  className?: string;
}

const PremiumBadge = ({ label = 'Premium', className = '' }: PremiumBadgeProps) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider gradient-drip text-primary-foreground ${className}`}>
    <Crown className="h-2.5 w-2.5" />
    {label}
  </span>
);

export default PremiumBadge;
