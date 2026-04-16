import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FadeIn } from './LandingAnimations';

const FAQS = [
  { q: 'How accurate is the body scan?', a: "20+ biometric data points extracted from two photos with sub-centimeter precision. Your measurements are cross-referenced against each brand's proprietary size chart — not generic S/M/L ranges." },
  { q: 'Is my body scan data private?', a: 'Your biometric data is encrypted end-to-end and never shared with retailers or third parties. Delete anytime. You own your geometry. Period.' },
  { q: 'How does AR try-on work?', a: 'Infinite Drape Studio renders garments directly onto your mapped silhouette using augmented reality. You see the actual drape, proportions, and fit on YOUR body — not a mannequin or model.' },
  { q: 'What are Body Twins?', a: 'Members who share your exact proportions — within verified measurement tolerances. When they try a piece, their fit feedback is directly applicable to you. Same body. Same drape.' },
  { q: 'What brands are available?', a: "186 brands across 69 retailers — from Arc'teryx and Stone Island to The Row and Totême. 9,000+ products and growing weekly." },
  { q: 'Is DripFit free?', a: 'Core features including body scanning, size verification, and browsing are free. Premium features like unlimited AR try-ons and advanced Twin matching are available with DripFit Pro.' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} className="py-6 cursor-pointer">
      <div className="flex justify-between items-center gap-4">
        <h4 className="type-headline text-base">{q}</h4>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </div>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <p className="type-body leading-relaxed mt-3 text-muted-foreground/80" style={{ fontSize: 15 }}>{a}</p>
      </motion.div>
    </div>
  );
}

export default function LandingFAQ() {
  return (
    <section className="py-20 md:py-24">
      <div className="max-w-2xl mx-auto px-6">
        <FadeIn>
          <h2 className="type-headline text-3xl md:text-4xl text-center mb-14">VERIFIED. ANSWERED.</h2>
        </FadeIn>
        <FadeIn delay={0.08}>
          <div className="divide-y divide-border/30">
            {FAQS.map((f, i) => (
              <FAQItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
