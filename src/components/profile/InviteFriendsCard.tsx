import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Share2, Copy, Check, Gift, MessageCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

export function InviteFriendsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile-referral', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('referral_code, referral_credits')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: referralCount } = useQuery({
    queryKey: ['referral-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  if (!profile?.referral_code) return null;

  const referralUrl = `https://dripfitcheck.lovable.app?ref=${profile.referral_code}`;
  const shareText = `Get your perfect fit with AI body scanning! Use my code ${profile.referral_code} — we both get 3 bonus try-ons 🔥`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    trackEvent('invite_copy_link');
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    trackEvent('invite_native_share');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DRIPFIT ✔ — Get Your Perfect Fit',
          text: shareText,
          url: referralUrl,
        });
      } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleSMS = () => {
    trackEvent('invite_sms');
    const body = encodeURIComponent(`${shareText}\n${referralUrl}`);
    window.open(`sms:?&body=${body}`, '_self');
  };

  const handleWhatsApp = () => {
    trackEvent('invite_whatsapp');
    const text = encodeURIComponent(`${shareText}\n${referralUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Gift className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-white/80">Invite Friends</span>
        {(referralCount ?? 0) > 0 && (
          <span className="ml-auto text-xs text-primary font-semibold">
            {referralCount} invited
          </span>
        )}
      </div>

      <p className="text-xs text-white/70 mb-2">
        You both get <span className="font-bold text-primary">3 bonus try-ons</span> when they sign up!
      </p>

      {(profile.referral_credits ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-primary">
          <span>✦</span>
          <span>{profile.referral_credits} bonus try-on{profile.referral_credits !== 1 ? 's' : ''} earned</span>
        </div>
      )}

      {/* Code display */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg glass-gold">
        <span className="flex-1 font-mono text-lg font-bold text-primary tracking-wider">
          {profile.referral_code}
        </span>
        <button onClick={handleCopy} className="text-primary/60 hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Copy referral code">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Share options */}
      <div className="flex gap-2 mb-2">
        <Button onClick={handleWhatsApp} variant="outline" size="sm" className="flex-1 h-10 rounded-lg text-[11px] font-semibold gap-1.5 bg-white/5 border-white/10 text-white/60 hover:bg-white/10">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </Button>
        <Button onClick={handleSMS} variant="outline" size="sm" className="flex-1 h-10 rounded-lg text-[11px] font-semibold gap-1.5 bg-white/5 border-white/10 text-white/60 hover:bg-white/10">
          <MessageCircle className="h-3.5 w-3.5" /> SMS
        </Button>
        <Button onClick={handleCopy} variant="outline" size="sm" className="flex-1 h-10 rounded-lg text-[11px] font-semibold gap-1.5 bg-white/5 border-white/10 text-white/60 hover:bg-white/10">
          <Link2 className="h-3.5 w-3.5" /> Link
        </Button>
      </div>

      <Button onClick={handleNativeShare} className="w-full gap-2 h-10 rounded-lg glass-gold text-primary font-bold text-[12px] tracking-wide uppercase border border-primary/20" size="sm">
        <Share2 className="w-4 h-4" /> Share Invite Link
      </Button>
    </div>
  );
}
