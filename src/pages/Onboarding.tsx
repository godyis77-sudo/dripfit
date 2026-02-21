import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Shield } from 'lucide-react';
import { setOnboarded, setFitPreference } from '@/lib/session';
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
      setStep('calibrate');
    } else {
      setOnboarded();
      navigate('/capture');
    }
  };

  const handleSkip = () => {
    setFitPreference(fit);
    setOnboarded();
    navigate('/capture');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          {step === 'fit' ? (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                How do you like your fit?
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                This helps us recommend the right size for you.
              </p>

              <div className="space-y-3 mb-8">
                {FIT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFit(opt.value)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                      fit === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <p className="font-bold text-foreground">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                What's your usual size?
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Optional — helps improve accuracy.
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {CALIBRATION_BRANDS.map(b => (
                  <button
                    key={b}
                    onClick={() => setBrand(brand === b ? null : b)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      brand === b
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground/60 hover:border-primary/30'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {brand && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-foreground/70 mb-2">
                    Your typical size in {brand}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(s => (
                      <button
                        key={s}
                        onClick={() => setBrandSize(brandSize === s ? '' : s)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                          brandSize === s
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-foreground/60'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="ghost" className="w-full mb-2 text-muted-foreground" onClick={handleSkip}>
                Skip for now
              </Button>
            </>
          )}

          <Button
            className="w-full h-14 rounded-2xl btn-3d-drip border-0 font-display font-bold text-lg uppercase tracking-wider"
            onClick={handleContinue}
          >
            {step === 'fit' ? 'Continue' : 'Start Scan'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-[11px] text-muted-foreground text-center mt-4 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" /> Private by default • delete anytime
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
