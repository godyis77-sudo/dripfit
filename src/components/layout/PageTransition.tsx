import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * Wrap page content for smooth luxury page transitions.
 */
export const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const pageVariants = {
    initial: { opacity: 0, y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -8, scale: reduceMotion ? 1 : 0.99 },
  };

  return (
    <motion.div
      key={location.pathname}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};
