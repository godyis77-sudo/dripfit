import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowLeft, RotateCcw, Check } from 'lucide-react';
import { CaptureStep, getStepConfig, PhotoSet, CalibrationObject } from '@/lib/types';

const STEPS: CaptureStep[] = ['front', 'side', 'armsOut'];

const Capture = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const calibrationObject = (location.state as { calibrationObject?: CalibrationObject })?.calibrationObject || 'ruler';
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<PhotoSet>({ front: null, side: null, armsOut: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step = STEPS[currentStep];
  const config = getStepConfig(calibrationObject)[step];
  const progress = ((currentStep + (photos[step] ? 1 : 0)) / 3) * 100;

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
    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1);
    } else {
      // All 3 photos taken — go to analysis
      navigate('/analyze', { state: { photos, calibrationObject } });
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
          <p className="text-xs text-muted-foreground">Step {currentStep + 1} of 3</p>
          <Progress value={progress} className="mt-1 h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm flex flex-col items-center"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">{config.title}</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{config.instruction}</p>

            {/* Photo preview or capture area */}
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-card border-2 border-dashed border-border mb-4">
              {photos[step] ? (
                <img
                  src={photos[step]!}
                  alt={config.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                  {/* Silhouette guide */}
                  <div className="relative">
                    <div className="w-24 h-40 border-2 border-dashed border-primary/30 rounded-full" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs text-primary/50 whitespace-nowrap">
                      {step === 'front' && '↑ Face camera'}
                      {step === 'side' && '↑ Turn sideways'}
                      {step === 'armsOut' && '← Arms out →'}
                    </div>
                  </div>
                  <p className="text-xs">Tap to capture</p>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center bg-muted/50 px-4 py-2 rounded-xl">
              💡 {config.tip}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-6 pb-8 pt-4 space-y-3 max-w-sm mx-auto w-full">
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
            <Button className="flex-1 h-14 rounded-2xl" onClick={handleNext}>
              <Check className="mr-2 h-4 w-4" />
              {currentStep < 2 ? 'Next' : 'Analyze'}
            </Button>
          </div>
        ) : (
          <Button className="w-full h-14 rounded-2xl text-base" onClick={handleCapture}>
            <Camera className="mr-2 h-5 w-5" /> Take Photo
          </Button>
        )}
      </div>
    </div>
  );
};

export default Capture;
