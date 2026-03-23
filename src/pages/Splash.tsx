import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BrandLogo from '@/components/ui/BrandLogo';

const SPLASH_DURATION = 2800;

const Splash = () => {
  const navigate = useNavigate();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), SPLASH_DURATION - 600);
    const navTimer = setTimeout(() => navigate('/home', { replace: true }), SPLASH_DURATION);
    return () => { clearTimeout(fadeTimer); clearTimeout(navTimer); };
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
        className="flex flex-col items-center gap-6"
      >
        <BrandLogo size="xxl" className="flex-col" />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-sm font-semibold tracking-[4px] uppercase text-muted-foreground"
        >
          Your Tailored Size & Style
        </motion.p>
      </motion.div>

      {/* Shimmer ring */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ delay: 0.8, duration: 2, repeat: Infinity }}
        className="absolute w-72 h-72 rounded-full border border-primary/20"
      />
    </motion.div>
  );
};

export default Splash;
