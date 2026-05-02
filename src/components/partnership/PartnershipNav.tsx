import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';

const NAV_ITEMS = [
  { label: 'The Problem', href: '#problem' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Integration', href: '#integration' },
  { label: 'Contact', href: '#contact' },
];

export default function PartnershipNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchor = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        scrolled
          ? 'bg-background/90 backdrop-blur-xl border-b border-border/30'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <BrandLogo size="sm" />

        <div className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleAnchor(e, item.href)}
              className="text-xs tracking-[.15em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/landing"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wider uppercase rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
          >
            Try the App <ExternalLink className="h-3 w-3" />
          </Link>
          <a
            href="#contact"
            onClick={(e) => handleAnchor(e, '#contact')}
            className="px-5 py-2 text-xs font-semibold tracking-wide rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Partner With Us
          </a>
        </div>
      </div>
    </nav>
  );
}
