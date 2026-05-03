import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  id: string;
  buttonText?: string;
}

export default function LandingEmailCapture({ id, buttonText = 'Request Access' }: Props) {
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
      const cleanEmail = email.toLowerCase().trim();
      setEmail('');
      toast({ title: '✨ You\'re in!', description: "You're on the waitlist.", className: 'border-primary bg-primary/10' });
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'waitlist-confirmation',
          recipientEmail: cleanEmail,
          idempotencyKey: `waitlist-${cleanEmail}`,
        },
      }).catch(() => {});
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 justify-center py-4 px-5 rounded-full bg-primary/10 border border-primary/20"
      >
        <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">You're on the list.</p>
          <p className="text-xs text-muted-foreground">We'll notify you at launch.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-13 pl-11 bg-secondary/80 backdrop-blur-sm border-border text-foreground placeholder:text-muted-foreground rounded-full focus-visible:ring-foreground/20 focus-visible:border-foreground/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-13 px-8 rounded-full bg-foreground text-background font-medium text-sm whitespace-nowrap shrink-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_hsl(var(--foreground)/0.15)] active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <span className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin inline-block" />
          ) : (
            <span className="flex items-center gap-2">{buttonText} <ArrowRight className="h-4 w-4" /></span>
          )}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-3 tracking-wide">
        Sizing intel dropped weekly. Unsubscribe anytime.
      </p>
    </form>
  );
}
