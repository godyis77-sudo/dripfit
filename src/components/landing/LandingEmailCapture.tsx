import { useState } from 'react';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  id: string;
  buttonText?: string;
}

export default function LandingEmailCapture({ id, buttonText = 'Get the Cheat Code' }: Props) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('waitlist_signups' as any)
        .insert([{ email: email.toLowerCase().trim(), source: id }] as any);
      if (error) {
        if (error.code === '23505') {
          toast({ title: '✔ Already on the list!', description: "You're already signed up." });
          setSubmitted(true);
          return;
        }
        throw error;
      }
      setSubmitted(true);
      setEmail('');
      toast({ title: '✨ You\'re in!', description: "You're on the waitlist.", className: 'border-primary bg-primary/10' });
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-3 justify-center py-4 px-5 rounded-2xl border"
        style={{ background: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.2)' }}>
        <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.15)' }}>
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-foreground">You're on the list!</p>
          <p className="text-[12px] text-foreground/70">We'll notify you when DripFit launches.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-12 pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground rounded-xl"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-12 px-7 rounded-md font-bold text-[13px] tracking-[0.08em] uppercase whitespace-nowrap shrink-0 transition-all duration-300 hover:-translate-y-px disabled:opacity-50"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(212,175,55,0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          {loading ? (
            <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />
          ) : (
            <span className="flex items-center gap-1.5">{buttonText} <ArrowRight className="h-3.5 w-3.5" /></span>
          )}
        </button>
      </div>
      <p className="text-[11px] text-center mt-3 tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
        No spam. Just sizing tips + launch updates.
      </p>
    </form>
  );
}
