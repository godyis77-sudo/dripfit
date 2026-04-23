import { useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, Lock, Shield, Sparkles } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BottomTabBar from '@/components/BottomTabBar';
import DecorativeSilhouette from '@/components/ui/DecorativeSilhouette';

const GuestProfileView = () => {
  const navigate = useNavigate();
  usePageMeta({
    title: 'Profile',
    description: 'Lock in your fit. Save scans, try-ons, and wardrobe — all in one place.',
    path: '/profile',
  });

  return (
    <div className="min-h-screen bg-background px-5 pt-8 pb-32 relative overflow-hidden">
      {/* Ambient gold glow — matches landing aesthetic */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(200,169,81,0.10) 0%, transparent 65%)', filter: 'blur(80px)' }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center text-center mt-4">
        {/* Decorative silhouette — lock badge centered at base */}
        <div className="relative mb-5 flex items-center justify-center" style={{ width: 120, height: 120 }}>
          <DecorativeSilhouette height={120} />
          {/* Lock badge — anchored to silhouette base, softened gold border */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-background border-2 border-primary/50 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]">
            <Lock className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>

        {/* Headline — refined editorial copy */}
        <h1
          className="type-display-editorial leading-[1.05] text-foreground"
          style={{ fontSize: 'clamp(28px, 7vw, 36px)' }}
        >
          LOCK IN.
          <span
            className="type-display-editorial type-display-editorial--italic block text-primary mt-1"
            style={{ fontSize: 'clamp(28px, 7vw, 36px)' }}
          >
            YOUR FIT.
          </span>
        </h1>

        <p className="text-sm text-muted-foreground/85 mt-4 mb-7 max-w-[300px] font-light">
          Save your scans, try-ons, and wardrobe — all in one place.
        </p>

        {/* Primary CTA — full-width gold pill, no leading icon */}
        <button
          onClick={() => navigate('/auth?mode=signup&returnTo=/profile')}
          className="w-full max-w-xs bg-primary text-primary-foreground font-bold rounded-full py-4 px-6 text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Start Your Scan <ArrowRight className="h-4 w-4" />
        </button>

        {/* Secondary — quiet text link below primary CTA */}
        <button
          onClick={() => navigate('/auth?mode=signin&returnTo=/profile')}
          className="mt-4 text-xs text-muted-foreground/80 hover:text-primary tracking-wide transition-colors"
        >
          Already have an account? <span className="text-primary underline-offset-4 hover:underline">Sign In</span>
        </button>
      </div>

      {/* Section divider — subtle gold rule */}
      <div className="relative z-10 flex justify-center mt-9 mb-8">
        <div className="h-px w-20" style={{ background: 'rgba(200,169,81,0.2)' }} />
      </div>

      {/* Benefits — upgraded with gold-tinted circular icon containers (Ecosystem-card style) */}
      <div className="relative z-10 space-y-2.5">
        {[
          { icon: Camera, title: 'Save Body Scans', desc: 'Keep your measurements synced across devices' },
          { icon: Sparkles, title: 'Unlimited Try-Ons', desc: 'Upgrade for unlimited virtual outfit previews' },
          { icon: Shield, title: 'Private & Secure', desc: 'Your data stays private — delete anytime' },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-4 p-4 rounded-2xl border border-border/40 bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-primary/20 bg-primary/[0.08]">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-bold text-foreground tracking-wide">{title}</p>
              <p className="text-[12px] text-muted-foreground/85 mt-0.5 leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <BottomTabBar />
    </div>
  );
};

export default GuestProfileView;
