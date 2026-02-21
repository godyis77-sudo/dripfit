import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowLeft, RotateCcw, Check, Shield, AlertTriangle, Ruler, Sun, Maximize, UserCheck, Shirt } from 'lucide-react';
import { CaptureStep, STEP_CONFIG, PhotoSet, ReferenceObject, REFERENCE_OBJECTS } from '@/lib/types';
import { getFitPreference } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';

const STEPS: CaptureStep[] = ['front', 'side'];

const GUIDANCE_TIPS = [
  { icon: Shirt, text: 'Wear fitted clothing' },
  { icon: Maximize, text: 'Stand 6–8 ft from camera' },
  { icon: UserCheck, text: 'Full body visible head-to-feet' },
  { icon: Sun, text: 'Good, even lighting' },
];

const Capture = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<PhotoSet>({ front: null, side: null });
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [useCm, setUseCm] = useState(false);
  const [refObject, setRefObject] = useState<ReferenceObject>('none');
  const [reviewing, setReviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step = STEPS[currentStep];
  const config = STEP_CONFIG[step];
  const progress = ((currentStep + (photos[step] ? 1 : 0)) / 2) * 100;

  const getHeightCm = (): number => {
    if (useCm) return parseFloat(heightCm) || 0;
    const ft = parseFloat(heightFt) || 0;
    const inches = parseFloat(heightIn) || 0;
    return Math.round((ft * 12 + inches) * 2.54);
  };

  const heightValid = getHeightCm() >= 120 && getHeightCm() <= 230;
  const heightTouched = !!(heightCm || heightFt || heightIn);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotos(prev => ({ ...prev, [step]: base64 }));
      setReviewing(true);
      trackEvent(step === 'front' ? 'scan_front_captured' : 'scan_side_captured');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNext = () => {
    setReviewing(false);
    if (currentStep < 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      trackEvent('scan_completed');
      navigate('/analyze', {
        state: {
          photos,
          heightCm: getHeightCm(),
          referenceObject: refObject,
          fitPreference: getFitPreference(),
        },
      });
    }
  };

  const handleRetake = () => {
    setPhotos(prev => ({ ...prev, [step]: null }));
    setReviewing(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-xl">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">Step {currentStep + 1} of 2</p>
          <Progress value={progress} className="mt-1 h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-5 pt-3 overflow-y-auto pb-4">
        {/* Height input — REQUIRED */}
        <div className="w-full max-w-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-primary" /> Your Height <span className="text-destructive text-xs">*</span>
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>ft/in</span>
              <Switch checked={useCm} onCheckedChange={setUseCm} className="scale-90" />
              <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
            </div>
          </div>
          {useCm ? (
            <Input
              type="number"
              placeholder="e.g. 175"
              value={heightCm}
              onChange={e => setHeightCm(e.target.value)}
              className="rounded-xl h-11"
              min={120}
              max={230}
            />
          ) : (
            <div className="flex gap-2">
              <Input type="number" placeholder="ft" value={heightFt} onChange={e => setHeightFt(e.target.value)} className="rounded-xl flex-1 h-11" min={4} max={7} />
              <Input type="number" placeholder="in" value={heightIn} onChange={e => setHeightIn(e.target.value)} className="rounded-xl flex-1 h-11" min={0} max={11} />
            </div>
          )}
          {heightTouched && !heightValid && (
            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Enter a valid height (120–230 cm / 4'0"–7'6")
            </p>
          )}
          {!heightTouched && (
            <p className="text-xs text-muted-foreground mt-1.5">Required before you can take photos.</p>
          )}
        </div>

        {/* Guidance cards — shown before first photo */}
        {!photos.front && currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm grid grid-cols-2 gap-2 mb-4"
          >
            {GUIDANCE_TIPS.map((tip, i) => (
              <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
                <tip.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[11px] font-medium text-foreground">{tip.text}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Review screen after capture */}
        {reviewing && photos[step] ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <h2 className="text-lg font-bold text-foreground mb-1">Review: {config.title}</h2>
            <p className="text-xs text-muted-foreground mb-3">Check that your full body is visible and well-lit.</p>

            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-border mb-3">
              <img src={photos[step]!} alt={config.title} className="w-full h-full object-cover" />
            </div>

            {/* Checklist indicators */}
            <div className="w-full grid grid-cols-2 gap-2 mb-3">
              {[
                { label: 'Full body visible', ok: true },
                { label: 'Good lighting', ok: true },
                { label: 'Correct angle', ok: true },
                { label: 'Pose detected', ok: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1.5">
                  <Check className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-medium text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : !reviewing ? (
          /* Photo capture area */
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm flex flex-col items-center"
            >
              <h2 className="text-xl font-bold text-foreground mb-1">{config.title}</h2>
              <p className="text-sm text-muted-foreground text-center mb-3">{config.instruction}</p>

              {/* Photo preview / capture with silhouette */}
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-card border-2 border-dashed border-border mb-3">
                {photos[step] ? (
                  <img src={photos[step]!} alt={config.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground relative">
                    <svg viewBox="0 0 120 220" className="h-[60%] opacity-15" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {step === 'front' ? (
                        <>
                          <ellipse cx="60" cy="22" rx="14" ry="16" />
                          <line x1="54" y1="38" x2="54" y2="48" />
                          <line x1="66" y1="38" x2="66" y2="48" />
                          <path d="M54 48 L30 56 L28 58 L30 60 L38 62 L38 100 L42 130 L48 130 L54 100 L54 48" />
                          <path d="M66 48 L90 56 L92 58 L90 60 L82 62 L82 100 L78 130 L72 130 L66 100 L66 48" />
                          <path d="M42 130 L38 180 L34 210 L46 210 L50 180 L54 130" />
                          <path d="M78 130 L82 180 L86 210 L74 210 L70 180 L66 130" />
                        </>
                      ) : (
                        <>
                          <ellipse cx="60" cy="22" rx="12" ry="16" />
                          <line x1="56" y1="38" x2="56" y2="48" />
                          <line x1="64" y1="38" x2="64" y2="48" />
                          <path d="M56 48 L48 56 L46 100 L48 130 L44 180 L40 210 L52 210 L56 180 L58 130 L58 48" />
                          <path d="M64 48 L72 56 L74 100 L72 130 L76 180 L80 210 L68 210 L64 180 L62 130 L62 48" />
                        </>
                      )}
                      <line x1="20" y1="212" x2="100" y2="212" strokeDasharray="4 4" opacity="0.5" />
                      <line x1="30" y1="4" x2="90" y2="4" strokeDasharray="4 4" opacity="0.5" />
                    </svg>
                    <p className="text-[11px] font-medium text-muted-foreground absolute bottom-5">
                      {step === 'front' ? 'Face camera • head to feet visible' : 'Turn 90° • head to feet visible'}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center bg-card border border-border px-4 py-2 rounded-xl mb-3">
                💡 {config.tip}
              </p>
            </motion.div>
          </AnimatePresence>
        ) : null}

        {/* Reference object — accordion card */}
        {!reviewing && (
          <div className="w-full max-w-sm mb-3">
            <Accordion type="single" collapsible>
              <AccordionItem value="ref" className="border border-border rounded-xl px-3">
                <AccordionTrigger className="text-sm font-bold text-foreground py-3 hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-primary" />
                    Add reference object for better accuracy
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Place a known-size object near you so we can calibrate distances more precisely.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {(Object.entries(REFERENCE_OBJECTS) as [ReferenceObject, { label: string; description: string }][])
                      .filter(([key]) => key !== 'none')
                      .map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => setRefObject(refObject === key ? 'none' : key)}
                          className={`text-left p-3 rounded-xl border text-sm transition-all active:scale-95 ${
                            refObject === key ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'
                          }`}
                        >
                          <p className="font-bold text-foreground text-xs">{val.label}</p>
                          <p className="text-[10px] text-muted-foreground">{val.description}</p>
                        </button>
                      ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-8 pt-2 space-y-2.5 max-w-sm mx-auto w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {reviewing && photos[step] ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-xl active:scale-95 transition-transform" onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl btn-luxury text-primary-foreground active:scale-95 transition-transform"
              onClick={handleNext}
            >
              <Check className="mr-2 h-4 w-4" />
              {currentStep < 1 ? 'Next: Side View' : 'Analyze Scan'}
            </Button>
          </div>
        ) : photos[step] && !reviewing ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-xl active:scale-95 transition-transform" onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl btn-luxury text-primary-foreground active:scale-95 transition-transform"
              onClick={() => setReviewing(true)}
            >
              Review Photo
            </Button>
          </div>
        ) : (
          <>
            <Button
              className="w-full h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground active:scale-95 transition-transform"
              onClick={handleCapture}
              disabled={!heightValid}
            >
              <Camera className="mr-2 h-5 w-5" /> Take {config.title} Photo
            </Button>
            {!heightValid && (
              <p className="text-[11px] text-muted-foreground text-center">
                {!heightTouched ? 'Enter your height above to enable capture.' : 'Fix your height entry to continue.'}
              </p>
            )}
          </>
        )}

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1 pt-1">
          <Shield className="h-3 w-3" /> Private by default • delete anytime
        </p>
      </div>
    </div>
  );
};

export default Capture;
