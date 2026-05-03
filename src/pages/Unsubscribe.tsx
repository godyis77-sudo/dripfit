import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type State = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
          headers: { apikey: SUPABASE_ANON_KEY },
        });
        const data = await r.json();
        if (data.valid) setState('valid');
        else if (data.reason === 'already_unsubscribed') setState('already');
        else setState('invalid');
      } catch { setState('error'); }
    })();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (error) throw error;
      if (data?.success) setState('success');
      else if (data?.reason === 'already_unsubscribed') setState('already');
      else setState('error');
    } catch { setState('error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
        <div className="text-xs tracking-[0.2em] font-bold text-primary mb-6">DRIPFIT ✔</div>

        {state === 'loading' && <p className="text-sm text-muted-foreground">Checking your link…</p>}

        {state === 'valid' && (
          <>
            <h1 className="text-2xl font-bold tracking-wide mb-3">UNSUBSCRIBE</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Confirm to stop receiving emails from DRIPFIT. You can resubscribe anytime.
            </p>
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground font-bold tracking-[0.15em] text-xs py-4 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'PROCESSING…' : 'CONFIRM UNSUBSCRIBE'}
            </button>
          </>
        )}

        {state === 'success' && (
          <>
            <h1 className="text-2xl font-bold tracking-wide mb-3">YOU'RE OUT.</h1>
            <p className="text-sm text-muted-foreground mb-6">You won't receive these emails anymore.</p>
            <Link to="/" className="text-xs tracking-[0.2em] text-primary font-bold underline">← BACK TO DRIPFIT</Link>
          </>
        )}

        {state === 'already' && (
          <>
            <h1 className="text-2xl font-bold tracking-wide mb-3">ALREADY UNSUBSCRIBED</h1>
            <p className="text-sm text-muted-foreground mb-6">No further action needed.</p>
            <Link to="/" className="text-xs tracking-[0.2em] text-primary font-bold underline">← BACK TO DRIPFIT</Link>
          </>
        )}

        {(state === 'invalid' || state === 'error') && (
          <>
            <h1 className="text-2xl font-bold tracking-wide mb-3">INVALID LINK</h1>
            <p className="text-sm text-muted-foreground mb-6">
              This unsubscribe link is invalid or expired. Email hello@dripfitcheck.com if you need help.
            </p>
            <Link to="/" className="text-xs tracking-[0.2em] text-primary font-bold underline">← BACK TO DRIPFIT</Link>
          </>
        )}
      </div>
    </div>
  );
}
