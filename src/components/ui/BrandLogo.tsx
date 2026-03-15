import iconCrown from '@/assets/icon-crown.png';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** sm = nav/footer, md = auth, lg = compact nav mark, xl = hero/splash */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Show just the icon (no text) */
  iconOnly?: boolean;
}

const sizeMap = {
  sm: { icon: 22, text: 'text-[15px]', gap: 'gap-1.5' },
  md: { icon: 32, text: 'text-[14px]', gap: 'gap-2' },
  lg: { icon: 44, text: 'text-sm', gap: 'gap-1.5' },
  xl: { icon: 88, text: 'text-2xl', gap: 'gap-1' },
};

const BrandLogo = ({ size = 'sm', className, iconOnly = false }: BrandLogoProps) => {
  const s = sizeMap[size];

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      {s.iconBox === 'no-box' ? (
        <img src={iconCrown} alt="DripFit crown" className="object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)] shrink-0" style={{ width: s.icon, height: s.icon }} />
      ) : (
        <div className={cn('brand-logo-icon flex items-center justify-center shrink-0', s.iconBox)}>
          <img src={iconCrown} alt="DripFit crown" className="object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]" style={{ width: s.icon, height: s.icon }} />
        </div>
      )}
      {!iconOnly && (
        <span className={cn('font-display font-bold tracking-[3px] brand-logo-text', s.text)}>
          DRIPFIT <span className="brand-logo-check text-[1.3em]">✔</span>
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
