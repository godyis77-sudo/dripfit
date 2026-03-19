import { forwardRef } from 'react';
import iconScan from '@/assets/icon-scan.png';
import iconTryon from '@/assets/icon-tryon-v2.png';
import iconSizeguide from '@/assets/icon-sizeguide.png';
import iconStylecheck from '@/assets/icon-stylecheck.png';
import iconPost from '@/assets/icon-post.png';
import iconHome from '@/assets/icon-home.png';
import iconProfile from '@/assets/icon-profile.png';
import iconCrown from '@/assets/icon-crown.png';
import { cn } from '@/lib/utils';

export const featureIcons = {
  scan: iconScan,
  tryon: iconTryon,
  sizeguide: iconSizeguide,
  stylecheck: iconStylecheck,
  post: iconPost,
  home: iconHome,
  profile: iconProfile,
  crown: iconCrown,
} as const;

export type FeatureIconName = keyof typeof featureIcons;

interface FeatureIconProps {
  name: FeatureIconName;
  size?: number;
  className?: string;
}

/** Renders one of the core brand identity icons at the given pixel size. */
const FeatureIcon = forwardRef<HTMLImageElement, FeatureIconProps>(({ name, size = 40, className }, ref) => (
  <div
    className="relative overflow-hidden rounded-lg"
    style={{ width: size, height: size, background: 'hsl(var(--background))' }}
  >
    <img
      ref={ref}
      src={featureIcons[name]}
      alt={name}
      className={cn('object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)] mix-blend-lighten', className)}
      style={{ width: size, height: size }}
    />
  </div>
));

FeatureIcon.displayName = 'FeatureIcon';

export default FeatureIcon;
