import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Crown, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';

const ResetPassword = () => {
  usePageTitle('Reset Password');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=recovery')) {
      setExpired(true);
    }
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords don\'t match', description: 'Please make sure both fields match.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not update password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (expired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[320px]">
          <Card className="rounded-xl border-border/40">
            <CardContent className="flex flex-col items-center gap-4 py-10 px-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500" />
              <CardTitle className="font-display text-xl">Link expired</CardTitle>
              <CardDescription className="text-[13px]">This reset link has expired or is invalid. Request a new one.</CardDescription>
              <Button onClick={() => navigate('/auth')} className="w-full rounded-lg btn-luxury text-primary-foreground font-display font-bold text-[14px] uppercase tracking-wider">
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[320px]">
          <Card className="rounded-xl border-border/40">
            <CardContent className="flex flex-col items-center gap-4 py-10 px-6 text-center">
              <CheckCircle className="h-12 w-12 text-primary" />
              <CardTitle className="font-display text-xl">Password updated</CardTitle>
              <CardDescription className="text-[13px]">You can now sign in with your new password. Redirecting…</CardDescription>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 h-[250px] w-[250px] rounded-full bg-primary/6 blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[320px]">
        <div className="flex flex-col items-center mb-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="h-11 w-11 rounded-xl gradient-drip glow-primary flex items-center justify-center ring-2 ring-primary/20 mb-2">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          <span className="font-display font-bold text-[12px] tracking-wider text-muted-foreground">DRIP FIT</span>
        </div>

        <Card className="rounded-xl border-border/40">
          <CardHeader className="text-center pb-1.5 pt-4 px-4">
            <CardTitle className="font-display text-xl">Reset Password</CardTitle>
            <CardDescription className="text-[13px] text-muted-foreground">Enter your new password below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="space-y-1">
                <Label htmlFor="new-password" className="text-[11px] text-foreground/70">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="new-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-8 pr-9 rounded-lg h-9 text-[13px] border-border/60 focus:border-primary" minLength={6} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors p-0.5">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password" className="text-[11px] text-foreground/70">Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="confirm-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-8 pr-9 rounded-lg h-9 text-[13px] border-border/60 focus:border-primary" minLength={6} required />
                </div>
              </div>
              <Button type="submit" className="w-full h-10 rounded-lg btn-luxury text-primary-foreground font-display font-bold text-[14px] uppercase tracking-wider" disabled={loading}>
                {loading ? 'Updating…' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
