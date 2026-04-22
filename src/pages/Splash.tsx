import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SPLASH_DURATION = 2800;

const Splash = () => {
  const navigate = useNavigate();
  const [fading, setFading] = useState(false);

  const onboardingDone = !!localStorage.getItem('onboarding_complete');

  useEffect(() => {
    if (onboardingDone) {
      navigate('/home', { replace: true });
      return;
    }

    if (!onboardingDone) {
      navigate('/home', { replace: true });
      return;
    }

    const fadeTimer = setTimeout(() => setFading(true), SPLASH_DURATION - 600);
    const navTimer = setTimeout(() => navigate('/home', { replace: true }), SPLASH_DURATION);
    return () => { clearTimeout(fadeTimer); clearTimeout(navTimer); };
  }, [navigate, onboardingDone]);

  // Always skip — splash is no longer needed
  return null;

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
        className="flex flex-col items-center gap-0"
      >
        <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tight text-foreground uppercase">
          DRIPFIT <span className="text-4xl text-primary">✔</span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mt-3"
        >
          YOUR BIOMETRIC SCAN.
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default Splash;
