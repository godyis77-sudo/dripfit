import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const RETURN_RATE_OPTIONS = [
  { value: '', label: 'Select range (optional)' },
  { value: '<10', label: 'Under 10%' },
  { value: '10-20', label: '10–20%' },
  { value: '20-30', label: '20–30%' },
  { value: '30+', label: '30%+' },
  { value: 'unknown', label: 'Not sure' },
];

export default function PartnershipContactForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    role: '',
    email: '',
    return_rate: '',
    message: '',
  });

  const handleChange = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.role || !form.email) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('partnership_leads').insert({
        company_name: form.company_name,
        role: form.role,
        email: form.email,
        return_rate: form.return_rate || null,
        message: form.message || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: 'Thanks — we\u2019ll be in touch within 48 hours.' });
    } catch (err: any) {
      toast({
        title: 'Something went wrong.',
        description: err?.message ?? 'Please try the email link below.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card border border-primary/30 rounded-2xl p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
        <h3 className="font-display text-xl font-bold mb-1">Conversation Started</h3>
        <p className="text-sm text-muted-foreground">
          We received your details. Expect a reply from partnerships@dripfitcheck.com within 48 hours.
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          required
          type="text"
          placeholder="Company name *"
          value={form.company_name}
          onChange={(e) => handleChange('company_name', e.target.value)}
          className={inputClass}
        />
        <input
          required
          type="text"
          placeholder="Your role *"
          value={form.role}
          onChange={(e) => handleChange('role', e.target.value)}
          className={inputClass}
        />
      </div>
      <input
        required
        type="email"
        placeholder="Work email *"
        value={form.email}
        onChange={(e) => handleChange('email', e.target.value)}
        className={inputClass}
      />
      <select
        value={form.return_rate}
        onChange={(e) => handleChange('return_rate', e.target.value)}
        className={inputClass}
      >
        {RETURN_RATE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <textarea
        rows={3}
        placeholder="Anything we should know? (optional)"
        value={form.message}
        onChange={(e) => handleChange('message', e.target.value)}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-xl py-3.5 px-6 text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Sending\u2026' : 'Start the Conversation'}
      </button>
      <p className="text-[11px] text-muted-foreground/70 text-center pt-1">
        Or email us directly:{' '}
        <a href="mailto:partnerships@dripfitcheck.com" className="text-primary hover:underline">
          partnerships@dripfitcheck.com
        </a>
      </p>
    </form>
  );
}
