import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** sm = nav/footer, md = auth, lg = compact nav mark, xl = hero/splash, xxl = splash full */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
  /** Show just the icon (no text) — renders a compact "DF✔" mark */
  iconOnly?: boolean;
}

const sizeMap = {
  sm: { text: 'text-[17px]' },
  md: { text: 'text-[20px]' },
  lg: { text: 'text-[16px]' },
  xl: { text: 'text-2xl' },
  xxl: { text: 'text-5xl' },
};

const BrandLogo = ({ size = 'sm', className, iconOnly = false }: BrandLogoProps) => {
  const s = sizeMap[size];

  return (
    <div className={cn('flex items-center', className)}>
      <span className={cn('font-display font-extrabold tracking-tight uppercase brand-logo-text', s.text)}>
        {iconOnly ? (
          <>DF<span className="brand-logo-check text-primary" style={{ fontSize: '80%' }}>✔</span></>
        ) : (
          <>DRIPFIT <span className="brand-logo-check text-primary" style={{ fontSize: '80%' }}>✔</span></>
        )}
      </span>
    </div>
  );
};

export default BrandLogo;
