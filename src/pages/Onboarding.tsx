import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Check } from 'lucide-react';
import { setOnboarded, setFitPreference } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import type { FitPreference } from '@/lib/types';
import { CALIBRATION_BRANDS } from '@/lib/types';

const FIT_OPTIONS: { value: FitPreference; label: string; desc: string }[] = [
  { value: 'fitted', label: 'Fitted', desc: 'Close to body, slim cut' },
  { value: 'regular', label: 'Regular', desc: 'Standard comfortable fit' },
  { value: 'relaxed', label: 'Relaxed', desc: 'Loose, oversized vibe' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'fit' | 'calibrate'>('fit');
  const [fit, setFit] = useState<FitPreference>('regular');
  const [brand, setBrand] = useState<string | null>(null);
  const [brandSize, setBrandSize] = useState('');

  const handleContinue = () => {
    if (step === 'fit') {
      setFitPreference(fit);
      trackEvent('onboarding_fit_selected', { fit });
      setStep('calibrate');
    } else {
      setOnboarded();
      trackEvent('onboarding_completed', { brand, brandSize });
      navigate('/capture');
    }
  };

  const handleSkip = () => {
    setFitPreference(fit);
    setOnboarded();
    trackEvent('onboarding_completed', { skippedCalibration: true });
    navigate('/capture');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[300px]">
        {/* Step indicator */}
        <div className="flex gap-1.5 mb-5">
          <div className={`h-1 rounded-full flex-1 ${step === 'fit' ? 'bg-primary' : 'bg-primary'}`} />
          <div className={`h-1 rounded-full flex-1 ${step === 'calibrate' ? 'bg-primary/60' : 'bg-border'}`} />
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
          {step === 'fit' ? (
            <>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Step 1 of 2</p>
              <h1 className="font-display text-xl font-bold text-foreground mb-1">How do you like your fit?</h1>
              <p className="text-[13px] text-muted-foreground mb-5">This helps us recommend the right size for your style.</p>
              <div className="space-y-2 mb-6">
                {FIT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFit(opt.value)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                      fit === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[14px] text-foreground">{opt.label}</p>
                        <p className="text-[12px] text-muted-foreground">{opt.desc}</p>
                      </div>
                      {fit === opt.value && (
                        <div className="h-5 w-5 rounded-full gradient-drip flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Step 2 of 2 · Optional</p>
              <h1 className="font-display text-xl font-bold text-foreground mb-1">Know your size in a brand?</h1>
              <p className="text-[13px] text-muted-foreground mb-5">This improves accuracy — skip if you're unsure.</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {CALIBRATION_BRANDS.map(b => (
                  <button key={b} onClick={() => setBrand(brand === b ? null : b)} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all active:scale-95 ${brand === b ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    {b}
                  </button>
                ))}
              </div>
              {brand && (
                <div className="mb-5">
                  <p className="text-[12px] text-muted-foreground mb-1.5">Your size in {brand}:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                      <button key={s} onClick={() => setBrandSize(brandSize === s ? '' : s)} className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all active:scale-95 ${brandSize === s ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="ghost" className="w-full mb-2 text-muted-foreground text-[13px]" onClick={handleSkip}>Skip for now</Button>
            </>
          )}

          <Button className="w-full h-12 rounded-xl btn-luxury text-primary-foreground border-0 font-display font-bold text-base uppercase tracking-wider active:scale-[0.97] transition-transform" onClick={handleContinue}>
            {step === 'fit' ? 'Continue' : 'Start My Scan'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-[10px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" /> Private by default · delete anytime
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
