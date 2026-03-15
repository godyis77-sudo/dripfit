import iconCrown from '@/assets/icon-crown.png';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** sm = nav/footer, md = auth, lg = onboarding/premium hero */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Show just the icon (no text) */
  iconOnly?: boolean;
}

const sizeMap = {
  sm: { icon: 18, iconBox: 'h-7 w-7 rounded-lg', text: 'text-[15px]', gap: 'gap-2' },
  md: { icon: 28, iconBox: 'h-11 w-11 rounded-xl', text: 'text-[14px]', gap: 'gap-2.5' },
  lg: { icon: 54, iconBox: '', text: 'text-2xl', gap: 'gap-3' },
};

const BrandLogo = ({ size = 'sm', className, iconOnly = false }: BrandLogoProps) => {
  const s = sizeMap[size];

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <div className={cn('brand-logo-icon flex items-center justify-center shrink-0', s.iconBox)}>
        <img src={iconCrown} alt="DripFit crown" className="object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]" style={{ width: s.icon, height: s.icon }} />
      </div>
      {!iconOnly && (
        <span className={cn('font-display font-bold tracking-[3px] brand-logo-text', s.text)}>
          DRIPFIT <span className="brand-logo-check">✔</span>
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
