import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import BrandLogo from '@/components/ui/BrandLogo';

const NAV_ITEMS = [
  { label: 'Problem', href: '#problem' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Proof', href: '#proof' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function LandingNav() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const handleAnchorClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMobileNavOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        scrolled || mobileNavOpen
          ? 'bg-background/90 backdrop-blur-xl border-b border-border/30'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <BrandLogo size="sm" />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleAnchorClick(e, item.href)}
              className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-[.15em] uppercase font-medium whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/home"
              className="px-5 py-2 text-sm font-semibold tracking-wide rounded-full border border-primary/40 text-primary bg-transparent hover:bg-primary/10 transition-colors duration-300"
            >
              Enter App
            </Link>
          ) : (
            <>
              <Link
                to="/auth?mode=signin"
                className="hidden sm:inline-block px-4 py-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="px-5 py-2 text-xs font-semibold tracking-wide rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-300 whitespace-nowrap"
              >
                Sign Up Free
              </Link>
            </>
          )}

          <button
            type="button"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-border/40 text-foreground hover:bg-primary/10 transition-colors"
          >
            {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileNavOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-2 flex flex-col gap-1 border-t border-border/30 bg-background/95 backdrop-blur-xl">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleAnchorClick(e, item.href)}
              className="py-3 text-sm tracking-[.15em] uppercase font-medium text-muted-foreground hover:text-foreground transition-colors border-b border-border/20 last:border-b-0"
            >
              {item.label}
            </a>
          ))}
          {!user && (
            <Link
              to="/auth?mode=signin"
              onClick={() => setMobileNavOpen(false)}
              className="sm:hidden mt-3 py-3 text-sm tracking-[.15em] uppercase font-semibold text-center text-foreground border border-primary/40 rounded-full hover:bg-primary/10 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
