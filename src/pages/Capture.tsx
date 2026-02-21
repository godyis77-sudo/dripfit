import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowLeft, RotateCcw, Check, Shield, AlertTriangle } from 'lucide-react';
import { CaptureStep, STEP_CONFIG, PhotoSet, ReferenceObject, REFERENCE_OBJECTS } from '@/lib/types';
import { getFitPreference } from '@/lib/session';

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
  const [showRefOptions, setShowRefOptions] = useState(false);
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
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNext = () => {
    if (currentStep < 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Both photos taken — go to analysis
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

  const canAnalyze = currentStep === 1 && photos.side && heightValid;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Step {currentStep + 1} of 2</p>
          <Progress value={progress} className="mt-1 h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-4">
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
            <p className="text-sm font-semibold text-foreground/80 text-center mb-4">{config.instruction}</p>

            {/* Photo preview / capture */}
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-card border-2 border-dashed border-border mb-3">
              {photos[step] ? (
                <img src={photos[step]!} alt={config.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                  {/* Pose overlay guide */}
                  <div className="relative">
                    <div className={`border-2 border-dashed border-primary/50 ${step === 'front' ? 'w-28 h-44 rounded-full' : 'w-16 h-44 rounded-2xl'}`} />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-primary/70 whitespace-nowrap">
                      {step === 'front' ? '↑ Face camera' : '↑ Turn sideways'}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground/50 mt-2">Tap to capture</p>
                </div>
              )}
            </div>

            <p className="text-sm font-medium text-foreground/70 text-center bg-muted/50 px-4 py-2 rounded-xl mb-3">
              💡 {config.tip}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Height input — always visible */}
        <div className="w-full max-w-sm mb-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-foreground">Your Height *</p>
            <div className="flex items-center gap-2 text-xs">
              <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>ft/in</span>
              <Switch checked={useCm} onCheckedChange={setUseCm} />
              <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
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
          {(heightCm || heightFt) && !heightValid && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Enter a valid height (120–230 cm)
            </p>
          )}
        </div>

        {/* Reference object toggle */}
        <div className="w-full max-w-sm mb-4">
          <button
            onClick={() => setShowRefOptions(!showRefOptions)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {showRefOptions ? 'Hide' : '+ Add reference object for better accuracy'}
          </button>
          {showRefOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden mt-2"
            >
              <div className="grid grid-cols-2 gap-2">
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
                      <p className="text-[10px] text-muted-foreground">{val.description}</p>
                    </button>
                  ))}
              </div>
            </motion.div>
          )}
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
          <Button className="w-full h-14 rounded-2xl text-base" onClick={handleCapture}>
            <Camera className="mr-2 h-5 w-5" /> Take Photo
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Private by default • delete anytime
        </p>
      </div>
      {/* No bottom nav in capture - focus mode */}
    </div>
  );
};

export default Capture;
