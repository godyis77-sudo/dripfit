import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * GPU-optimized page transition with scale, blur, and opacity.
 * Uses will-change and transform3d for compositor-only animations.
 */
export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const pageVariants = {
    initial: {
      opacity: 0,
      y: reduceMotion ? 0 : 12,
      scale: reduceMotion ? 1 : 0.985,
      filter: reduceMotion ? 'none' : 'blur(3px)',
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
    },
    exit: {
      opacity: 0,
      y: reduceMotion ? 0 : -8,
      scale: reduceMotion ? 1 : 0.995,
      filter: reduceMotion ? 'none' : 'blur(1px)',
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
        duration: reduceMotion ? 0 : 0.28,
        ease: [0.16, 1, 0.3, 1],
        filter: { duration: reduceMotion ? 0 : 0.2 },
      }}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};
