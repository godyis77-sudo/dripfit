import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Ruler, Mail, Lock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: 'We sent you a confirmation link.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Ruler className="h-7 w-7 text-primary" />
          </div>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle>{isLogin ? 'Welcome Back' : 'Create Account'}</CardTitle>
            <CardDescription className="font-semibold text-foreground/70">{isLogin ? 'Sign in to access your measurements' : 'Join the community'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="name" placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="pl-9 rounded-xl" required />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-9 rounded-xl" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-9 rounded-xl" minLength={6} required />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-2xl" disabled={loading}>
                {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Sign Up'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
