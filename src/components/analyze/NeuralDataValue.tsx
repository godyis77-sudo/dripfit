import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Props {
  value: { min: number; max: number } | number | null;
  isHeight?: boolean;
  useCm?: boolean;
}

const CM_TO_IN = 0.3937;

/**
 * "Number Scramble" lock-in effect.
 * Rapidly cycles random digits until a real value arrives, then snaps to it.
 * Height is always shown statically — no scramble.
 */
const NeuralDataValue = ({ value, isHeight = false, useCm = true }: Props) => {
  const hasValue = value !== null && value !== undefined;
  // Height: never scramble — show input value statically from the start
  const [scrambling, setScrambling] = useState(!isHeight);
  const [display, setDisplay] = useState('---');
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    if (isHeight) return; // static
    if (hasValue) {
      // Lock-in once real value arrives
      const timer = window.setTimeout(() => {
        clearInterval(intervalRef.current);
        setScrambling(false);
      }, 250);
      return () => {
        clearInterval(intervalRef.current);
        clearTimeout(timer);
      };
    }
    // Continuous scramble until value arrives
    setScrambling(true);
    intervalRef.current = window.setInterval(() => {
      const r1 = Math.floor(Math.random() * 60 + (useCm ? 60 : 24));
      const r2 = r1 + Math.floor(Math.random() * 8 + 2);
      setDisplay(`${r1}–${r2}`);
    }, 60);
    return () => clearInterval(intervalRef.current);
  }, [value, hasValue, isHeight, useCm]);

  const finalText = (() => {
    if (!hasValue) return '---';
    if (isHeight && typeof value === 'number') {
      if (useCm) return `${Math.round(value)}`;
      const totalIn = Math.round(value * CM_TO_IN);
      return `${Math.floor(totalIn / 12)}'${totalIn % 12}"`;
    }
    if (typeof value === 'object' && value && 'min' in value && 'max' in value) {
      const min = useCm ? value.min : value.min * CM_TO_IN;
      const max = useCm ? value.max : value.max * CM_TO_IN;
      return useCm
        ? `${min.toFixed(0)}–${max.toFixed(0)}`
        : `${min.toFixed(1)}–${max.toFixed(1)}`;
    }
    return '---';
  })();

  const showUnit = hasValue && (typeof value === 'object' || (isHeight && useCm));
  const unitLabel = isHeight && !useCm ? '' : useCm ? 'cm' : 'in';

  return (
    <motion.span
      className="text-[12px] font-black text-foreground leading-tight inline-block"
      animate={
        scrambling
          ? { opacity: 1 }
          : { scale: [1.25, 1], filter: ['brightness(2.5)', 'brightness(1)'] }
      }
      transition={
        scrambling
          ? { duration: 0.05 }
          : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {scrambling ? display : finalText}
      {!scrambling && showUnit && unitLabel && (
        <span className="text-[10px] font-bold ml-0.5 opacity-60">{unitLabel}</span>
      )}
    </motion.span>
  );
};

export default NeuralDataValue;
