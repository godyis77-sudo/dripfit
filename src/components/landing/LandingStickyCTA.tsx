import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LandingStickyCTA() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (user) return null;

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
