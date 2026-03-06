import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Crown, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Shield, Ruler, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { setGuestMode, setOnboarded } from '@/lib/session';

const VALUE_PROPS = [
  { icon: Ruler, text: 'AI body measurements' },
  { icon: Sparkles, text: 'Virtual try-on preview' },
  { icon: Users, text: 'Real fit feedback' },
];

const Auth = () => {
  usePageTitle('Sign In');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        trackEvent('auth_completed', { method: 'email' });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        trackEvent('auth_completed', { method: 'email_signup' });
        toast({ title: 'Check your email', description: 'We sent a confirmation link to verify your account.' });
      }
    } catch (err: any) {
      const msg = err.message?.includes('Invalid login credentials')
        ? 'Invalid credentials. If you signed up with Google, use the Google button instead.'
        : err.message;
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (error) throw error;
      trackEvent('auth_completed', { method: provider });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSocialLoading(null); }
  };

  const handleForgotPassword = async () => {
    if (!email) { toast({ title: 'Enter your email first', description: 'Type your email above, then tap "Forgot password?" again.' }); return; }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      toast({ title: 'Reset link sent', description: 'Check your inbox for the password reset link.' });
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 h-[250px] w-[250px] rounded-full bg-primary/6 blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[320px]">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="mb-3 h-8 w-8 rounded-lg text-muted-foreground" aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center mb-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="h-11 w-11 rounded-xl gradient-drip glow-primary flex items-center justify-center ring-2 ring-primary/20 mb-2">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          <span className="font-display font-bold text-[12px] tracking-wider text-muted-foreground">DRIPFITCHECK</span>
        </div>

        <Card className="rounded-xl border-border/40">
          <CardHeader className="text-center pb-1.5 pt-4 px-4">
            <CardTitle className="font-display text-xl">{isLogin ? 'Welcome Back' : 'Join DRIPFITCHECK'}</CardTitle>
            <CardDescription className="text-[13px] text-muted-foreground">
              {isLogin
                ? 'Sign in to access your saved sizes, Try-Ons, and Fit Checks'
                : 'Create a free account to save your results and get personalized sizing'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            {/* Value props for sign up */}
            {!isLogin && (
              <div className="flex items-center justify-center gap-3 py-1">
                {VALUE_PROPS.map(v => (
                  <div key={v.text} className="flex items-center gap-1">
                    <v.icon className="h-3 w-3 text-primary/70" />
                    <span className="text-[9px] text-muted-foreground">{v.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-10 rounded-lg text-[12px] font-semibold border-border/60 text-foreground active:scale-[0.97] transition-transform" onClick={() => handleSocialLogin('google')} disabled={!!socialLoading}>
                {socialLoading === 'google' ? '…' : (<><svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Google</>)}
              </Button>
              <Button variant="outline" className="flex-1 h-10 rounded-lg text-[12px] font-semibold border-border/60 text-foreground active:scale-[0.97] transition-transform" onClick={() => handleSocialLogin('apple')} disabled={!!socialLoading}>
                {socialLoading === 'apple' ? '…' : (<><svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>Apple</>)}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
              <div className="relative flex justify-center text-[11px]"><span className="bg-card px-2 text-muted-foreground font-medium">or continue with email</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* No extra fields — collect progressively */}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[11px] text-foreground/70">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-8 rounded-lg h-9 text-[13px] border-border/60 focus:border-primary" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-[11px] text-foreground/70">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-8 pr-9 rounded-lg h-9 text-[13px] border-border/60 focus:border-primary" minLength={6} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors p-0.5">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {isLogin && (
                <button type="button" onClick={handleForgotPassword} className="text-[11px] text-primary font-semibold hover:underline py-1 px-1 -ml-1">
                  Forgot password?
                </button>
              )}
              <Button type="submit" className="w-full h-10 rounded-lg btn-luxury text-primary-foreground font-display font-bold text-[14px] uppercase tracking-wider" disabled={loading}>
                {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-[12px] text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-bold hover:underline">{isLogin ? 'Sign Up' : 'Sign In'}</button>
            </p>

            <p className="text-[9px] text-muted-foreground/50 text-center">
              By continuing, you agree to our Terms &{' '}
              <button onClick={() => navigate('/privacy')} className="underline hover:text-muted-foreground">Privacy Policy</button>.
            </p>

            <button
              onClick={() => {
                setGuestMode();
                setOnboarded();
                trackEvent('auth_guest_mode');
                navigate('/');
              }}
              className="w-full text-center text-[13px] text-muted-foreground font-semibold hover:text-foreground transition-colors mt-1"
            >
              Continue as Guest →
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
