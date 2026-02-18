import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const inView = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FooterCTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <>
      <motion.div
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        className="w-full max-w-sm text-center mb-8"
      >
        <h2 className="font-display text-xl font-bold mb-2 tracking-wide">
          Ready to Check Your <span className="gradient-drip-text">Drip</span>?
        </h2>
        <p className="text-foreground/60 text-sm font-medium mb-4">Join the community and never second-guess your fit.</p>
        <Button
          onClick={() => user ? navigate('/capture') : navigate('/auth')}
          className="w-full h-16 text-3xl font-display font-extrabold uppercase tracking-widest btn-3d-drip border-0 rounded-2xl"
          size="lg"
        >
          {user ? "LET'S GO" : "GET STARTED"} <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>

      <motion.footer
        variants={inView}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="flex flex-col items-center gap-3 text-foreground/40 mb-4"
      >
        <div className="flex items-center gap-2 text-[10px]">
          <Zap className="h-3 w-3 text-primary" />
          <span className="font-display">DRIP FIT</span>
          <span>• AI-Powered Fashion</span>
        </div>
        <div className="flex items-center gap-3 text-[9px]">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <span className="text-border">•</span>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <span className="text-border">•</span>
          <span>Made with ❤️</span>
        </div>
      </motion.footer>
    </>
  );
};

export default FooterCTA;
