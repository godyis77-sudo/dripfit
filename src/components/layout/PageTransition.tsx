import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * GPU-optimized page transition with scale, blur, and opacity.
 * Uses will-change and transform3d for compositor-only animations.
 */
export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const disableEnterAnimation = reduceMotion || location.pathname === '/home';

  if (disableEnterAnimation) {
    return <div>{children}</div>;
  }

  const pageVariants = {
    initial: {
      opacity: 0,
      y: 8,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: -6,
    },
  };

  return (
    <motion.div
      key={location.pathname}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};
