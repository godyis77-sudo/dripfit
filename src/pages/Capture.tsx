import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowLeft, RotateCcw, Check, Shield, AlertTriangle, Ruler } from 'lucide-react';
import { CaptureStep, STEP_CONFIG, PhotoSet, ReferenceObject, REFERENCE_OBJECTS } from '@/lib/types';
import { getFitPreference } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';

const STEPS: CaptureStep[] = ['front', 'side'];

const Capture = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<PhotoSet>({ front: null, side: null });
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [useCm, setUseCm] = useState(false);
  const [refObject, setRefObject] = useState<ReferenceObject>('none');
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
      trackEvent(step === 'front' ? 'scan_front_captured' : 'scan_side_captured');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNext = () => {
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
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-xs text-foreground/60">Step {currentStep + 1} of 2</p>
          <Progress value={progress} className="mt-1 h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-4 overflow-y-auto">
        {/* Height input — REQUIRED, shown first */}
        <div className="w-full max-w-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Ruler className="h-4 w-4 text-primary" /> Your Height <span className="text-destructive">*</span>
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className={!useCm ? 'text-primary font-bold' : 'text-foreground/50'}>ft/in</span>
              <Switch checked={useCm} onCheckedChange={setUseCm} />
              <span className={useCm ? 'text-primary font-bold' : 'text-foreground/50'}>cm</span>
            </div>
          </div>
          {useCm ? (
            <Input
              type="number"
              placeholder="e.g. 175"
              value={heightCm}
              onChange={e => setHeightCm(e.target.value)}
              className="rounded-xl"
              min={120}
              max={230}
            />
          ) : (
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="ft"
                value={heightFt}
                onChange={e => setHeightFt(e.target.value)}
                className="rounded-xl flex-1"
                min={4}
                max={7}
              />
              <Input
                type="number"
                placeholder="in"
                value={heightIn}
                onChange={e => setHeightIn(e.target.value)}
                className="rounded-xl flex-1"
                min={0}
                max={11}
              />
            </div>
          )}
          {heightTouched && !heightValid && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Enter a valid height (120–230 cm / 4'0"–7'6")
            </p>
          )}
          {!heightTouched && (
            <p className="text-xs text-foreground/50 mt-1">Required before you can take photos.</p>
          )}
        </div>

        {/* Photo capture area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <h2 className="text-2xl font-bold text-foreground mb-1">{config.title}</h2>
            <p className="text-sm font-semibold text-foreground/70 text-center mb-4">{config.instruction}</p>

            {/* Photo preview / capture with silhouette */}
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-card border-2 border-dashed border-border mb-3">
              {photos[step] ? (
                <img src={photos[step]!} alt={config.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground relative">
                  {/* Full-body silhouette guide */}
                  <svg viewBox="0 0 120 220" className="h-[65%] opacity-20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {step === 'front' ? (
                      <>
                        {/* Head */}
                        <ellipse cx="60" cy="22" rx="14" ry="16" />
                        {/* Neck */}
                        <line x1="54" y1="38" x2="54" y2="48" />
                        <line x1="66" y1="38" x2="66" y2="48" />
                        {/* Shoulders + torso */}
                        <path d="M54 48 L30 56 L28 58 L30 60 L38 62 L38 100 L42 130 L48 130 L54 100 L54 48" />
                        <path d="M66 48 L90 56 L92 58 L90 60 L82 62 L82 100 L78 130 L72 130 L66 100 L66 48" />
                        {/* Hips + legs */}
                        <path d="M42 130 L38 180 L34 210 L46 210 L50 180 L54 130" />
                        <path d="M78 130 L82 180 L86 210 L74 210 L70 180 L66 130" />
                      </>
                    ) : (
                      <>
                        {/* Side view head */}
                        <ellipse cx="60" cy="22" rx="12" ry="16" />
                        {/* Neck */}
                        <line x1="56" y1="38" x2="56" y2="48" />
                        <line x1="64" y1="38" x2="64" y2="48" />
                        {/* Side torso */}
                        <path d="M56 48 L48 56 L46 100 L48 130 L44 180 L40 210 L52 210 L56 180 L58 130 L58 48" />
                        <path d="M64 48 L72 56 L74 100 L72 130 L76 180 L80 210 L68 210 L64 180 L62 130 L62 48" />
                      </>
                    )}
                    {/* Floor markers */}
                    <line x1="20" y1="212" x2="100" y2="212" strokeDasharray="4 4" opacity="0.5" />
                    {/* Head marker */}
                    <line x1="30" y1="4" x2="90" y2="4" strokeDasharray="4 4" opacity="0.5" />
                  </svg>
                  <p className="text-xs font-semibold text-foreground/50 absolute bottom-6">
                    {step === 'front' ? 'Face camera • head to feet visible' : 'Turn 90° • head to feet visible'}
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm font-medium text-foreground/70 text-center bg-muted/50 px-4 py-2 rounded-xl mb-3">
              💡 {config.tip}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Reference object — accordion card */}
        <div className="w-full max-w-sm mb-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="ref" className="border rounded-2xl px-3">
              <AccordionTrigger className="text-sm font-bold text-foreground py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-primary" />
                  Add reference object for better accuracy
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2 pb-2">
                  {(Object.entries(REFERENCE_OBJECTS) as [ReferenceObject, { label: string; description: string }][])
                    .filter(([key]) => key !== 'none')
                    .map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setRefObject(refObject === key ? 'none' : key)}
                        className={`text-left p-3 rounded-xl border text-sm transition-all ${
                          refObject === key ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <p className="font-bold text-foreground text-xs">{val.label}</p>
                        <p className="text-[10px] text-foreground/50">{val.description}</p>
                      </button>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-8 pt-2 space-y-3 max-w-sm mx-auto w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {photos[step] ? (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl" onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <Button
              className="flex-1 h-14 rounded-2xl"
              onClick={handleNext}
              disabled={currentStep === 1 && !heightValid}
            >
              <Check className="mr-2 h-4 w-4" />
              {currentStep < 1 ? 'Next' : 'Analyze'}
            </Button>
          </div>
        ) : (
          <Button
            className="w-full h-14 rounded-2xl text-base"
            onClick={handleCapture}
            disabled={!heightValid}
          >
            <Camera className="mr-2 h-5 w-5" /> Take Photo
          </Button>
        )}

        {!heightValid && !photos[step] && (
          <p className="text-xs text-foreground/50 text-center">Enter your height above to enable capture.</p>
        )}

        <p className="text-[11px] text-foreground/60 text-center flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Private by default • delete anytime
        </p>
      </div>
    </div>
  );
};

export default Capture;
