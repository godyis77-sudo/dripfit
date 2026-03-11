import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * Wrap page content for smooth luxury page transitions.
 * Enhanced with scale, blur, and layered opacity for a premium feel.
 */
export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const pageVariants = {
    initial: {
      opacity: 0,
      y: reduceMotion ? 0 : 16,
      scale: reduceMotion ? 1 : 0.98,
      filter: reduceMotion ? 'none' : 'blur(4px)',
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
    },
    exit: {
      opacity: 0,
      y: reduceMotion ? 0 : -10,
      scale: reduceMotion ? 1 : 0.99,
      filter: reduceMotion ? 'none' : 'blur(2px)',
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
        duration: reduceMotion ? 0 : 0.35,
        ease: [0.16, 1, 0.3, 1],
        filter: { duration: reduceMotion ? 0 : 0.25 },
      }}
    >
      {children}
    </motion.div>
  );
};
