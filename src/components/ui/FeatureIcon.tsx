import { forwardRef } from 'react';
import iconScan from '@/assets/icon-scan.webp';
import iconTryon from '@/assets/icon-tryon-v2.webp';
import iconSizeguide from '@/assets/icon-sizeguide.webp';
import iconStylecheck from '@/assets/icon-stylecheck.webp';
import iconPost from '@/assets/icon-post.webp';
import iconHome from '@/assets/icon-home.webp';
import iconProfile from '@/assets/icon-profile.webp';
import iconCrown from '@/assets/icon-crown.webp';
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
  <img
    ref={ref}
    src={featureIcons[name]}
    alt={name}
    className={cn('object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]', className)}
    style={{ width: size, height: size }}
  />
));

FeatureIcon.displayName = 'FeatureIcon';

export default FeatureIcon;
