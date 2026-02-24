import { motion } from "framer-motion";

/**
 * Animated checkmark for successful saves.
 */
export const SuccessCheck = ({ size = 24 }: { size?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
  >
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      className="stroke-primary"
      strokeWidth="2"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4 }}
    />
    <motion.path
      d="M8 12.5L11 15.5L16 9.5"
      className="stroke-primary"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    />
  </motion.svg>
);
