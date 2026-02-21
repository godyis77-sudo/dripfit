import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, ArrowLeft, RotateCcw, Check, Shield, AlertTriangle,
  Ruler, Sun, Maximize, Shirt, ChevronRight, Eye,
} from 'lucide-react';
import { CaptureStep, STEP_CONFIG, PhotoSet, ReferenceObject, REFERENCE_OBJECTS } from '@/lib/types';
import { getFitPreference } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';

type FlowStep = 'height' | 'front' | 'side' | 'review';
const FLOW_STEPS: { key: FlowStep; label: string }[] = [
  { key: 'height', label: 'Height' },
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'review', label: 'Review' },
];

const GUIDANCE = [
  { icon: Shirt, text: 'Wear fitted clothing' },
  { icon: Maximize, text: 'Stand 6–8 ft away' },
  { icon: Sun, text: 'Good, even lighting' },
  { icon: Eye, text: 'Full body in frame' },
];

const Capture = () => {
  const navigate = useNavigate();
  const [flowStep, setFlowStep] = useState<FlowStep>('height');
  const [photos, setPhotos] = useState<PhotoSet>({ front: null, side: null });
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [useCm, setUseCm] = useState(false);
  const [refObject, setRefObject] = useState<ReferenceObject>('none');
  const [reviewing, setReviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getHeightCm = (): number => {
    if (useCm) return parseFloat(heightCm) || 0;
    const ft = parseFloat(heightFt) || 0;
    const inches = parseFloat(heightIn) || 0;
    return Math.round((ft * 12 + inches) * 2.54);
  };

  const heightValid = getHeightCm() >= 120 && getHeightCm() <= 230;
  const heightTouched = !!(heightCm || heightFt || heightIn);

  const checklist = useMemo(() => [
    { label: 'Height entered', done: heightValid },
    { label: 'Front photo', done: !!photos.front },
    { label: 'Side photo', done: !!photos.side },
  ], [heightValid, photos.front, photos.side]);

  const allDone = checklist.every(c => c.done);
  const flowIdx = FLOW_STEPS.findIndex(s => s.key === flowStep);

  const captureStep: CaptureStep = flowStep === 'side' ? 'side' : 'front';
  const config = STEP_CONFIG[captureStep];

  const handleCapture = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const key = flowStep === 'side' ? 'side' : 'front';
      setPhotos(prev => ({ ...prev, [key]: base64 }));
      setReviewing(true);
      trackEvent(key === 'front' ? 'scan_front_captured' : 'scan_side_captured');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePhotoAccept = () => {
    setReviewing(false);
    if (flowStep === 'front') setFlowStep('side');
    else if (flowStep === 'side') setFlowStep('review');
  };

  const handleRetake = () => {
    const key = flowStep === 'side' ? 'side' : 'front';
    setPhotos(prev => ({ ...prev, [key]: null }));
    setReviewing(false);
  };

  const handleAnalyze = () => {
    trackEvent('scan_completed');
    navigate('/analyze', {
      state: {
        photos,
        heightCm: getHeightCm(),
        referenceObject: refObject,
        fitPreference: getFitPreference(),
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Button variant="ghost" size="icon" onClick={() => {
          if (flowStep === 'height') navigate(-1);
          else if (flowStep === 'front') setFlowStep('height');
          else if (flowStep === 'side') setFlowStep('front');
          else setFlowStep('side');
        }} className="h-8 w-8 rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Scan</p>
          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {FLOW_STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                <div className={`h-1.5 rounded-full flex-1 transition-colors ${
                  i < flowIdx ? 'bg-primary' : i === flowIdx ? 'bg-primary/60' : 'bg-border'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {FLOW_STEPS.map((s, i) => (
              <span key={s.key} className={`text-[9px] font-medium ${
                i <= flowIdx ? 'text-primary' : 'text-muted-foreground'
              }`}>{s.label}</span>
            ))}
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-4 pt-2 overflow-y-auto pb-4">
        <AnimatePresence mode="wait">
          {/* ─── STEP: HEIGHT ─── */}
          {flowStep === 'height' && (
            <motion.div key="height" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm">
              <h2 className="text-lg font-bold text-foreground mb-0.5">Enter your height</h2>
              <p className="text-[12px] text-muted-foreground mb-4">We need this to calculate accurate body measurements.</p>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                  <Ruler className="h-3.5 w-3.5 text-primary" /> Height <span className="text-destructive text-[10px]">*</span>
                </p>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>ft/in</span>
                  <Switch checked={useCm} onCheckedChange={setUseCm} className="scale-[0.8]" />
                  <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
                </div>
              </div>

              {useCm ? (
                <Input type="number" placeholder="e.g. 175" value={heightCm} onChange={e => setHeightCm(e.target.value)} className="rounded-lg h-11 text-sm" min={120} max={230} />
              ) : (
                <div className="flex gap-2">
                  <Input type="number" placeholder="ft" value={heightFt} onChange={e => setHeightFt(e.target.value)} className="rounded-lg flex-1 h-11 text-sm" min={4} max={7} />
                  <Input type="number" placeholder="in" value={heightIn} onChange={e => setHeightIn(e.target.value)} className="rounded-lg flex-1 h-11 text-sm" min={0} max={11} />
                </div>
              )}

              {heightTouched && !heightValid && (
                <p className="text-[11px] text-destructive mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Valid range: 120–230 cm / 4'0"–7'6"
                </p>
              )}
              {!heightTouched && (
                <p className="text-[11px] text-muted-foreground mt-1.5">Enter your height to continue.</p>
              )}

              {/* Reference object - collapsed */}
              <div className="mt-4">
                <Accordion type="single" collapsible>
                  <AccordionItem value="ref" className="border border-border rounded-lg px-3">
                    <AccordionTrigger className="text-[12px] font-bold text-foreground py-2.5 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <Ruler className="h-3.5 w-3.5 text-primary" />
                        Reference object <span className="text-muted-foreground font-normal">(optional)</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Place a known-size object near you for better calibration.
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 pb-2">
                        {(Object.entries(REFERENCE_OBJECTS) as [ReferenceObject, { label: string; description: string }][])
                          .filter(([key]) => key !== 'none')
                          .map(([key, val]) => (
                            <button
                              key={key}
                              onClick={() => setRefObject(refObject === key ? 'none' : key)}
                              className={`text-center p-2 rounded-lg border transition-all active:scale-95 ${
                                refObject === key ? 'border-primary bg-primary/10' : 'border-border'
                              }`}
                            >
                              <p className="font-bold text-[10px] text-foreground">{val.label}</p>
                              <p className="text-[9px] text-muted-foreground">{val.description}</p>
                            </button>
                          ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Photo guidance */}
              <div className="mt-4">
                <p className="section-label mb-2">Photo Tips</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {GUIDANCE.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                      <g.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-[11px] text-foreground/80">{g.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── STEP: FRONT / SIDE CAPTURE ─── */}
          {(flowStep === 'front' || flowStep === 'side') && !reviewing && (
            <motion.div key={flowStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center">
              <h2 className="text-lg font-bold text-foreground mb-0.5">{config.title}</h2>
              <p className="text-[12px] text-muted-foreground text-center mb-3">{config.instruction}</p>

              {/* Viewfinder */}
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-card border-2 border-dashed border-border mb-3">
                {photos[captureStep] ? (
                  <img src={photos[captureStep]!} alt={config.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground relative">
                    <svg viewBox="0 0 120 220" className="h-[50%] opacity-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {captureStep === 'front' ? (
                        <>
                          <ellipse cx="60" cy="22" rx="14" ry="16" />
                          <line x1="54" y1="38" x2="54" y2="48" /><line x1="66" y1="38" x2="66" y2="48" />
                          <path d="M54 48 L30 56 L28 58 L30 60 L38 62 L38 100 L42 130 L48 130 L54 100 L54 48" />
                          <path d="M66 48 L90 56 L92 58 L90 60 L82 62 L82 100 L78 130 L72 130 L66 100 L66 48" />
                          <path d="M42 130 L38 180 L34 210 L46 210 L50 180 L54 130" />
                          <path d="M78 130 L82 180 L86 210 L74 210 L70 180 L66 130" />
                        </>
                      ) : (
                        <>
                          <ellipse cx="60" cy="22" rx="12" ry="16" />
                          <line x1="56" y1="38" x2="56" y2="48" /><line x1="64" y1="38" x2="64" y2="48" />
                          <path d="M56 48 L48 56 L46 100 L48 130 L44 180 L40 210 L52 210 L56 180 L58 130 L58 48" />
                          <path d="M64 48 L72 56 L74 100 L72 130 L76 180 L80 210 L68 210 L64 180 L62 130 L62 48" />
                        </>
                      )}
                      <line x1="20" y1="212" x2="100" y2="212" strokeDasharray="4 4" opacity="0.5" />
                    </svg>
                    <p className="text-[11px] font-medium text-muted-foreground absolute bottom-4">
                      {captureStep === 'front' ? 'Face camera · head to feet' : 'Turn 90° · head to feet'}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground text-center bg-card border border-border px-3 py-1.5 rounded-lg mb-3">
                💡 {config.tip}
              </p>
            </motion.div>
          )}

          {/* ─── PHOTO REVIEW ─── */}
          {(flowStep === 'front' || flowStep === 'side') && reviewing && photos[captureStep] && (
            <motion.div key={`review-${flowStep}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm flex flex-col items-center">
              <h2 className="text-base font-bold text-foreground mb-1">Review: {config.title}</h2>
              <p className="text-[11px] text-muted-foreground mb-2">Full body visible and well-lit?</p>
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-border mb-3">
                <img src={photos[captureStep]!} alt={config.title} className="w-full h-full object-cover" />
              </div>
              <div className="w-full grid grid-cols-2 gap-1.5 mb-2">
                {['Full body visible', 'Good lighting', 'Correct angle', 'Fitted clothing'].map((label, i) => (
                  <div key={i} className="flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-lg px-2 py-1.5">
                    <Check className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-foreground/80">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── STEP: FINAL REVIEW ─── */}
          {flowStep === 'review' && (
            <motion.div key="review-final" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm">
              <h2 className="text-lg font-bold text-foreground mb-1">Ready to Analyze</h2>
              <p className="text-[12px] text-muted-foreground mb-4">Review your inputs before we estimate your measurements.</p>

              {/* Checklist */}
              <div className="space-y-2 mb-4">
                {checklist.map((c) => (
                  <div key={c.label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors ${
                    c.done ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
                  }`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                      c.done ? 'gradient-drip' : 'border border-border'
                    }`}>
                      {c.done && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className={`text-[13px] font-medium ${c.done ? 'text-foreground' : 'text-muted-foreground'}`}>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Photo thumbnails */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['front', 'side'] as const).map((key) => (
                  <div key={key} className="relative">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{key} view</p>
                    <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border bg-card">
                      {photos[key] ? (
                        <img src={photos[key]!} alt={`${key} view`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[11px]">Missing</div>
                      )}
                    </div>
                    {photos[key] && (
                      <button
                        onClick={() => { setPhotos(p => ({ ...p, [key]: null })); setFlowStep(key); }}
                        className="absolute top-6 right-1 bg-card/80 backdrop-blur rounded-md px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Retake
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Height summary */}
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 mb-4">
                <Ruler className="h-3.5 w-3.5 text-primary" />
                <span className="text-[12px] text-foreground font-medium">Height: {getHeightCm()} cm</span>
                <button onClick={() => setFlowStep('height')} className="ml-auto text-[10px] text-primary font-medium">Edit</button>
              </div>

              {refObject !== 'none' && (
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 mb-4">
                  <Ruler className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[12px] text-foreground font-medium">Ref: {REFERENCE_OBJECTS[refObject].label}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="px-4 pb-6 pt-2 space-y-2 max-w-sm mx-auto w-full">
        {flowStep === 'height' && (
          <Button
            className="w-full h-11 rounded-lg text-sm font-bold btn-luxury text-primary-foreground active:scale-[0.97] transition-transform"
            disabled={!heightValid}
            onClick={() => setFlowStep('front')}
          >
            Continue to Photos <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}

        {(flowStep === 'front' || flowStep === 'side') && !reviewing && (
          <>
            {photos[captureStep] ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-11 rounded-lg active:scale-[0.97] transition-transform text-sm" onClick={handleRetake}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
                </Button>
                <Button className="flex-1 h-11 rounded-lg btn-luxury text-primary-foreground active:scale-[0.97] transition-transform text-sm" onClick={() => setReviewing(true)}>
                  Review
                </Button>
              </div>
            ) : (
              <Button className="w-full h-11 rounded-lg text-sm font-bold btn-luxury text-primary-foreground active:scale-[0.97] transition-transform" onClick={handleCapture}>
                <Camera className="mr-2 h-4 w-4" /> Take {config.title} Photo
              </Button>
            )}
          </>
        )}

        {(flowStep === 'front' || flowStep === 'side') && reviewing && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-11 rounded-lg active:scale-[0.97] transition-transform text-sm" onClick={handleRetake}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
            </Button>
            <Button className="flex-1 h-11 rounded-lg btn-luxury text-primary-foreground active:scale-[0.97] transition-transform text-sm" onClick={handlePhotoAccept}>
              <Check className="mr-1.5 h-4 w-4" />
              {flowStep === 'front' ? 'Next: Side' : 'Review All'}
            </Button>
          </div>
        )}

        {flowStep === 'review' && (
          <Button
            className="w-full h-11 rounded-lg text-sm font-bold btn-luxury text-primary-foreground active:scale-[0.97] transition-transform"
            disabled={!allDone}
            onClick={handleAnalyze}
          >
            Analyze Scan
          </Button>
        )}

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Private by default · delete anytime
        </p>
      </div>
    </div>
  );
};

export default Capture;
