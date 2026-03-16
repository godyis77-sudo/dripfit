import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Props {
  value: { min: number; max: number } | number | null;
  isHeight?: boolean;
}

/**
 * "Number Scramble" lock-in effect.
 * Rapidly cycles random digits for 600ms, then snaps to actual value.
 */
const NeuralDataValue = ({ value, isHeight = false }: Props) => {
  const [scrambling, setScrambling] = useState(true);
  const [display, setDisplay] = useState('---');
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    // Start scramble
    setScrambling(true);
    intervalRef.current = window.setInterval(() => {
      const r1 = Math.floor(Math.random() * 900 + 100);
      const r2 = Math.floor(Math.random() * 900 + 100);
      setDisplay(`${r1}–${r2}`);
    }, 40);

    const timer = window.setTimeout(() => {
      clearInterval(intervalRef.current);
      setScrambling(false);
    }, 600);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timer);
    };
  }, [value]);

  const finalText = (() => {
    if (!value) return '---';
    if (isHeight && typeof value === 'number') return `${value} cm`;
    if (typeof value === 'object' && 'min' in value && 'max' in value) {
      return `${value.min?.toFixed(0)}–${value.max?.toFixed(0)}`;
    }
    return '---';
  })();

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
      {!scrambling && typeof value === 'object' && value && (
        <span className="text-[10px] font-bold ml-0.5 opacity-60">cm</span>
      )}
    </motion.span>
  );
};

export default NeuralDataValue;
