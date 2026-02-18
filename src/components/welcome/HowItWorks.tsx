import { motion } from 'framer-motion';
import { Camera, Sparkles, Shirt, Users } from 'lucide-react';

const inView = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const steps = [
  { step: "01", text: "Snap a photo with any reference object", icon: Camera },
  { step: "02", text: "AI analyzes your measurements instantly", icon: Sparkles },
  { step: "03", text: "Drip check any outfit virtually", icon: Shirt },
  { step: "04", text: "Share & get community feedback", icon: Users },
];

const HowItWorks = () => (
  <motion.div
    variants={inView}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: "-50px" }}
    className="w-full max-w-lg mb-10"
  >
    <h2 className="font-display text-lg font-bold text-center mb-5 tracking-wide">
      How It <span className="gradient-drip-text">Works</span>
    </h2>
    <div className="relative">
      <div className="absolute left-[1.35rem] top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
      <div className="space-y-2.5">
        {steps.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="relative flex items-center gap-3 glass rounded-xl p-3 border border-border/30"
          >
            <span className="font-display text-xl font-bold gradient-drip-text shrink-0 w-8 text-center relative z-10">{item.step}</span>
            <p className="text-sm font-medium flex-1">{item.text}</p>
            <item.icon className="h-4 w-4 text-foreground/40 shrink-0" />
          </motion.div>
        ))}
      </div>
    </div>
  </motion.div>
);

export default HowItWorks;
