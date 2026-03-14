import iconScan from '@/assets/icon-scan.png';
import iconTryon from '@/assets/icon-tryon-v3.png';
import iconSizeguide from '@/assets/icon-sizeguide.png';
import iconStylecheck from '@/assets/icon-stylecheck.png';
import iconPost from '@/assets/icon-post.png';
import iconHome from '@/assets/icon-home.png';
import iconProfile from '@/assets/icon-profile.png';
import { cn } from '@/lib/utils';

export const featureIcons = {
  scan: iconScan,
  tryon: iconTryon,
  sizeguide: iconSizeguide,
  stylecheck: iconStylecheck,
  post: iconPost,
  home: iconHome,
  profile: iconProfile,
} as const;

export type FeatureIconName = keyof typeof featureIcons;

interface FeatureIconProps {
  name: FeatureIconName;
  size?: number;
  className?: string;
}

/** Renders one of the 4 core brand identity icons at the given pixel size. */
const FeatureIcon = ({ name, size = 40, className }: FeatureIconProps) => (
  <img
    src={featureIcons[name]}
    alt={name}
    className={cn('object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]', className)}
    style={{ width: size, height: size }}
  />
);

export default FeatureIcon;
