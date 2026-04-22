import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LandingStickyCTA() {
  const { user } = useAuth();
  const [scrolledPast, setScrolledPast] = useState(false);
  const [finalCtaVisible, setFinalCtaVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > 900);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide once Final CTA section enters the viewport — avoids overlapping the
  // "encrypted / never sold" trust signal at the close of the page.
  useEffect(() => {
    const findTarget = (): HTMLElement | null => {
      const tagged = document.querySelector<HTMLElement>('[data-final-cta]');
      if (tagged) return tagged;
      const sections = document.querySelectorAll<HTMLElement>('section');
      return sections.length ? sections[sections.length - 1] : null;
    };

    const target = findTarget();
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => setFinalCtaVisible(entry.isIntersecting));
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    observerRef.current.observe(target);
    return () => observerRef.current?.disconnect();
  }, []);

  if (user) return null;

  const visible = scrolledPast && !finalCtaVisible;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 bg-black/90 backdrop-blur-sm border-t border-border/40 transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden={!visible}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex justify-center">
        <Link
          to="/auth"
          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-full py-3 px-6 text-sm tracking-wide hover:opacity-90 transition-opacity duration-200"
        >
          Start Your Scan <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
