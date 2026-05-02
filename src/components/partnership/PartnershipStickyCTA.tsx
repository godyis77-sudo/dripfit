import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function PartnershipStickyCTA() {
  const [scrolledPast, setScrolledPast] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolledPast(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const target = document.getElementById('contact');
    if (!target) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setContactVisible(e.isIntersecting)),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 },
    );
    obs.observe(target);
    return () => obs.disconnect();
  }, []);

  const visible = scrolledPast && !contactVisible;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 bg-black/90 backdrop-blur-sm border-t border-border/40 transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-hidden={!visible}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex justify-center">
        <a
          href="#contact"
          onClick={handleClick}
          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-full py-3 px-6 text-sm tracking-wide hover:opacity-90 transition-opacity duration-200"
        >
          Partner With Us <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
