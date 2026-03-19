import { forwardRef } from 'react';
import iconScan from '@/assets/icon-scan.webp';
import iconTryon from '@/assets/icon-tryon-v2.webp';
import iconSizeguide from '@/assets/icon-sizeguide.webp';
import iconStylecheck from '@/assets/icon-stylecheck.webp';
import iconPost from '@/assets/icon-post.webp';
import iconHome from '@/assets/icon-home.webp';
import iconProfile from '@/assets/icon-profile.webp';
import iconCrown from '@/assets/icon-crown.webp';
import iconSparkles from '@/assets/icon-sparkles.webp';
import iconShield from '@/assets/icon-shield.webp';
import iconStar from '@/assets/icon-star.webp';
import iconZap from '@/assets/icon-zap.webp';
import iconCheck from '@/assets/icon-check.webp';
import iconShop from '@/assets/icon-shop.webp';
import iconMail from '@/assets/icon-mail.webp';
import iconEye from '@/assets/icon-eye.webp';
import iconChart from '@/assets/icon-chart.webp';
import iconGlobe from '@/assets/icon-globe.webp';
import iconLock from '@/assets/icon-lock.webp';
import iconUsers from '@/assets/icon-users.webp';
import iconStore from '@/assets/icon-store.webp';
import iconRuler from '@/assets/icon-ruler.webp';
import iconShirt from '@/assets/icon-shirt.webp';
import iconMessage from '@/assets/icon-message.webp';
import iconHeart from '@/assets/icon-heart.webp';
import iconShare from '@/assets/icon-share.webp';
import { cn } from '@/lib/utils';
import { svgIcons } from './FeatureIconSvg';

export const featureIcons = {
  scan: iconScan,
  tryon: iconTryon,
  sizeguide: iconSizeguide,
  stylecheck: iconStylecheck,
  post: iconPost,
  home: iconHome,
  profile: iconProfile,
  crown: iconCrown,
  sparkles: iconSparkles,
  shield: iconShield,
  star: iconStar,
  zap: iconZap,
  check: iconCheck,
  shop: iconShop,
  mail: iconMail,
  eye: iconEye,
  chart: iconChart,
  globe: iconGlobe,
  lock: iconLock,
  users: iconUsers,
  store: iconStore,
  ruler: iconRuler,
  shirt: iconShirt,
  message: iconMessage,
  heart: iconHeart,
  share: iconShare,
  man: iconShare, // SVG-only, raster fallback unused
  woman: iconShare,
  manwoman: iconShare,
} as const;

export type FeatureIconName = keyof typeof featureIcons;

interface FeatureIconProps {
  name: FeatureIconName;
  size?: number;
  className?: string;
  /** Force WebP raster icon (used by bottom tab bar). Default: false (uses SVG). */
  raster?: boolean;
}

/** Renders one of the core brand identity icons at the given pixel size. */
const FeatureIcon = forwardRef<HTMLImageElement | SVGSVGElement, FeatureIconProps>(
  ({ name, size = 40, className, raster = false }, ref) => {
    const svgBuilder = !raster ? svgIcons[name] : undefined;

    if (svgBuilder) {
      return (
        <svg
          ref={ref as React.Ref<SVGSVGElement>}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn('drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]', className)}
          style={{ width: size, height: size }}
        >
          {svgBuilder()}
        </svg>
      );
    }

    return (
      <img
        ref={ref as React.Ref<HTMLImageElement>}
        src={featureIcons[name]}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={cn('object-contain mix-blend-lighten drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]', className)}
        style={{ width: size, height: size }}
      />
    );
  }
);

FeatureIcon.displayName = 'FeatureIcon';

export default FeatureIcon;
