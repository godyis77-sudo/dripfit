import iconCrown from '@/assets/icon-crown.webp';
import { cn } from '@/lib/utils';

interface InlineCrownProps {
  /** Size in pixels (default 16) */
  size?: number;
  className?: string;
}

/** Drop-in replacement for Lucide Crown — uses the 3D gold crown asset. */
const InlineCrown = ({ size = 16, className }: InlineCrownProps) => (
  <img
    src={iconCrown}
    alt=""
    aria-hidden="true"
    className={cn('object-contain shrink-0 mix-blend-lighten drop-shadow-[0_1px_3px_hsl(var(--drip-gold)/0.4)]', className)}
    style={{ width: size, height: size }}
  />
);

export default InlineCrown;
