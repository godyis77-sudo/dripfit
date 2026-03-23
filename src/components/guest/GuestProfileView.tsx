import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Camera, Sparkles, Shield, User } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BottomTabBar from '@/components/BottomTabBar';

const GuestProfileView = () => {
  const navigate = useNavigate();
  usePageTitle('Profile');

  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-safe-tab">
      <div className="flex flex-col items-center text-center mt-8">
        <div className="h-20 w-20 rounded-full bg-muted border border-border flex items-center justify-center mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground mb-1">Guest Mode</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
          Sign up to save your scans, try-ons, and wardrobe — all in one place.
        </p>
        <Button className="w-full max-w-xs h-11 btn-luxury text-primary-foreground text-sm font-bold mb-3" onClick={() => navigate('/auth?returnTo=/profile')}>
          <Sparkles className="mr-2 h-4 w-4" /> Create Free Account
        </Button>
        <Button variant="outline" className="w-full max-w-xs h-10 text-sm font-bold mb-8" onClick={() => navigate('/auth?returnTo=/profile')}>
          Sign In
        </Button>
      </div>

      <div className="space-y-3 mt-4">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">What you get with an account</p>
        <div className="space-y-2">
          {[
            { icon: Camera, title: 'Save Body Scans', desc: 'Keep your measurements synced across devices' },
            { icon: Sparkles, title: 'Unlimited Try-Ons', desc: 'Upgrade for unlimited virtual outfit previews' },
            { icon: Shield, title: 'Private & Secure', desc: 'Your data stays private — delete anytime' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Button variant="ghost" className="text-[12px] text-muted-foreground" onClick={() => navigate('/')}>
          ← Back to Home
        </Button>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default GuestProfileView;
