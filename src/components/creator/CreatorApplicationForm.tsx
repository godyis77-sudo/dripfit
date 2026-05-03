import { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PLATFORM_OPTIONS = [
  { value: '', label: 'Primary platform *' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'Other', label: 'Other' },
];

const AUDIENCE_OPTIONS = [
  { value: '', label: 'Audience size *' },
  { value: '<1K', label: 'Under 1,000' },
  { value: '1-10K', label: '1,000 – 10,000' },
  { value: '10-50K', label: '10,000 – 50,000' },
  { value: '50K+', label: '50,000+' },
];

export default function CreatorApplicationForm() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    platform: '',
    audience_size: '',
    email: '',
  });

  const handleChange = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.platform || !form.audience_size || !form.email) return;
    setSubmitting(true);
    try {
      const cleanEmail = form.email.toLowerCase().trim();
      const { error } = await supabase.from('creator_leads').insert({
        name: form.name.trim(),
        platform: form.platform,
        audience_size: form.audience_size,
        email: cleanEmail,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: 'Application received — we respond within 48 hours.' });
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'creator-application',
          recipientEmail: cleanEmail,
          idempotencyKey: `creator-${cleanEmail}-${Date.now()}`,
          templateData: {
            name: form.name.trim(),
            platform: form.platform,
            audienceSize: form.audience_size,
          },
        },
      }).catch(() => {});
    } catch (err: any) {
      toast({
        title: 'Something went wrong.',
        description: err?.message ?? 'Please email us directly below.',
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
        <h3 className="font-display text-xl font-bold mb-1">Application Received</h3>
        <p className="text-sm text-muted-foreground">
          We review every application personally. Expect a reply from hello@dripfitcheck.com within 48 hours.
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <input
        required
        type="text"
        placeholder="Your name *"
        value={form.name}
        onChange={(e) => handleChange('name', e.target.value)}
        maxLength={100}
        className={inputClass}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          required
          value={form.platform}
          onChange={(e) => handleChange('platform', e.target.value)}
          className={inputClass}
        >
          {PLATFORM_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} disabled={o.value === ''}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          required
          value={form.audience_size}
          onChange={(e) => handleChange('audience_size', e.target.value)}
          className={inputClass}
        >
          {AUDIENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} disabled={o.value === ''}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <input
        required
        type="email"
        placeholder="Email *"
        value={form.email}
        onChange={(e) => handleChange('email', e.target.value)}
        maxLength={255}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-xl py-3.5 px-6 text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending…' : 'Apply Now'}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>
      <p className="text-[11px] text-muted-foreground/70 text-center pt-1">
        Or email us directly:{' '}
        <a href="mailto:hello@dripfitcheck.com?subject=Creator%20Program%20Application" className="text-primary hover:underline">
          hello@dripfitcheck.com
        </a>
      </p>
    </form>
  );
}
