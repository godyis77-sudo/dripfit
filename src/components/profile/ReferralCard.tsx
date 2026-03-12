import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Share2, Copy, Check, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function ReferralCard() {
  const { user } = useAuth();
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

  const referralUrl = `https://dripfitcheck.lovable.app?ref=${profile?.referral_code}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'DRIPFIT ✔',
        text: 'Get your perfect fit with AI body scanning — try DRIPFIT ✔ free',
        url: referralUrl,
      });
    } else {
      handleCopy();
    }
  };

  if (!profile?.referral_code) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 mb-4 bg-card border border-primary/20"
    >
      <div className="flex items-center gap-2 mb-1">
        <Gift className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Refer a Friend</span>
        {referralCount! > 0 && (
          <span className="ml-auto text-xs text-primary font-semibold">
            {referralCount} referred
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Share your code. Earn credits when friends complete their first scan.
      </p>
      {(profile.referral_credits ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-primary">
          <span>✦</span>
          <span>{profile.referral_credits} credit{profile.referral_credits !== 1 ? 's' : ''} earned</span>
        </div>
      )}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-background">
        <span className="flex-1 text-sm font-mono font-bold text-primary tracking-widest">
          {profile.referral_code}
        </span>
        <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <Button onClick={handleShare} className="w-full gap-2" size="sm">
        <Share2 className="w-4 h-4" /> Share My Code
      </Button>
    </motion.div>
  );
}
