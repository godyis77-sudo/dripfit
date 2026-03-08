import { useState, useRef, useMemo, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, ArrowLeft, RotateCcw, Check, Shield, AlertTriangle,
  Ruler, Sun, Maximize, Shirt, ChevronRight, Eye, Upload,
} from 'lucide-react';
import { CaptureStep, STEP_CONFIG, PhotoSet, ReferenceObject, REFERENCE_OBJECTS } from '@/lib/types';
import { getFitPreference } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';

type FlowStep = 'intro' | 'height' | 'front' | 'side' | 'review';
const FLOW_STEPS: { key: FlowStep; label: string }[] = [
  { key: 'intro', label: 'Intro' },
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

const SCAN_STATE_KEY = 'dripcheck_scan_state';
function loadScanState() {
  try { const raw = sessionStorage.getItem(SCAN_STATE_KEY); if (raw) return JSON.parse(raw); } catch {} return null;
}
function saveScanState(state: Record<string, unknown>) {
  try { sessionStorage.setItem(SCAN_STATE_KEY, JSON.stringify(state)); } catch {}
}
function clearScanState() {
  try { sessionStorage.removeItem(SCAN_STATE_KEY); } catch {}
}

import scanResultsPreview from '@/assets/scan-results-preview.png';
import bodySilhouetteGlow from '@/assets/body-silhouette-glow.png';

/* Animated silhouette for intro */
const AnimatedSilhouette = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    className="flex items-center justify-center"
  >
    <div className="relative rounded-[1rem] border-[3px] border-primary" style={{ boxShadow: '0 0 16px 6px hsl(45 88% 50% / 0.7), 0 0 50px 18px hsl(45 88% 45% / 0.35), 0 0 90px 30px hsl(45 88% 40% / 0.15), inset 0 0 14px 3px hsl(45 88% 50% / 0.2)' }}>
      <div className="overflow-hidden rounded-[calc(1rem-3px)]">
        <img
          src={scanResultsPreview}
          alt="Scan results preview"
          className="h-[300px] w-auto object-cover"
        />
      </div>
      <div className="absolute -inset-[7px] rounded-[calc(1rem+4px)] border-[4px] border-black pointer-events-none" style={{ boxShadow: 'inset 0 0 8px 2px hsl(45 88% 50% / 0.7), 0 0 10px 2px hsl(45 88% 50% / 0.6), 0 0 20px 4px hsl(45 88% 50% / 0.25)' }} />
    </div>
  </motion.div>
);

const Capture = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Scan');
  const saved = loadScanState();
  const [flowStep, setFlowStep] = useState<FlowStep>(saved?.flowStep || 'intro');
  const [photos, setPhotos] = useState<PhotoSet>(saved?.photos || { front: null, side: null });
  const [heightCm, setHeightCm] = useState(saved?.heightCm || '');
  const [heightFt, setHeightFt] = useState(saved?.heightFt || '');
  const [heightIn, setHeightIn] = useState(saved?.heightIn || '');
  const [useCm, setUseCm] = useState(saved?.useCm || false);
  const [refObject, setRefObject] = useState<ReferenceObject>(saved?.refObject || 'none');
  const [reviewing, setReviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [genderSet, setGenderSet] = useState<string | null>(null);
  const [genderLoaded, setGenderLoaded] = useState(false);

  // Load existing gender from profile
  useEffect(() => {
    if (!user) { setGenderLoaded(true); return; }
    supabase.from('profiles').select('gender').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setGenderSet((data as any).gender || null);
      setGenderLoaded(true);
    });
  }, [user]);

  const handleGenderSelect = async (value: string) => {
    setGenderSet(value);
    if (user) {
      await supabase.from('profiles').update({ gender: value } as any).eq('user_id', user.id);
    }
  };

  useEffect(() => { trackEvent('scan_started'); }, []);
  useEffect(() => {
    if (flowStep !== 'intro') saveScanState({ flowStep, photos, heightCm, heightFt, heightIn, useCm, refObject });
  }, [flowStep, photos, heightCm, heightFt, heightIn, useCm, refObject]);

  const getHeightCm = (): number => {
    if (useCm) return parseFloat(heightCm) || 0;
    return Math.round(((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0)) * 2.54);
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

  const handleCapture = async () => {
    if (isNativePlatform()) {
      try {
        const result = await takeNativePhoto('camera');
        const key = flowStep === 'side' ? 'side' : 'front';
        setPhotos(prev => ({ ...prev, [key]: result.dataUrl }));
        setReviewing(true);
        trackEvent(key === 'front' ? 'scan_front_captured' : 'scan_side_captured');
      } catch (err: any) {
        // User cancelled or camera error — silently ignore cancellation
        if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) return;
        console.error('Native camera error:', err);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

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
    clearScanState();
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

  const goBack = () => {
    if (flowStep === 'intro') navigate(-1);
    else if (flowStep === 'height') setFlowStep('intro');
    else if (flowStep === 'front') setFlowStep('height');
    else if (flowStep === 'side') setFlowStep('front');
    else setFlowStep('side');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-1">
        <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8 rounded-xl min-h-[44px] min-w-[44px] mb-2" aria-label="Go back">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Numbered circle stepper */}
        <div className="flex items-center justify-between h-14">
          {FLOW_STEPS.map((s, i) => {
            const completed = i < flowIdx;
            const active = i === flowIdx;
            return (
              <div key={s.key} className="flex flex-col items-center flex-1 relative">
                {/* Connecting line (not on first step) */}
                {i > 0 && (
                  <div
                    className={`absolute top-[14px] right-1/2 w-full h-[2px] -z-10 transition-colors ${
                      i <= flowIdx ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
                {/* Circle */}
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shrink-0 ${
                    completed
                      ? 'bg-primary text-primary-foreground'
                      : active
                        ? 'border-2 border-primary text-primary'
                        : 'border border-border text-muted-foreground'
                  }`}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {/* Label */}
                <span
                  className={`text-[9px] mt-1 font-semibold ${
                    completed ? 'text-primary' : active ? 'text-primary font-bold' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-4 pt-2 overflow-y-auto pb-4">
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: INTRO ─── */}
          {flowStep === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center text-center pt-4">
              <AnimatedSilhouette />

              <h2 className="text-xl font-bold text-foreground mt-6 mb-2">
                Get your exact measurements in 60 seconds
              </h2>

              <div className="w-full space-y-2 mt-4 text-left">
                {[
                  { emoji: '📸', text: 'Take 2 photos (front + side)' },
                  { emoji: '👕', text: 'Wear form-fitting clothes' },
                  { emoji: '🧱', text: 'Stand against a plain wall' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 min-h-[44px]"
                  >
                    <span className="text-base">{item.emoji}</span>
                    <span className="text-[13px] font-medium text-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Privacy trust panel */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="w-full bg-card border border-border rounded-xl px-4 py-3 mt-5 flex items-start gap-3"
              >
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-foreground leading-tight mb-0.5">Your privacy is protected</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Photos are processed on-device. Nothing is stored without your consent.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── STEP 2: HEIGHT ─── */}
          {flowStep === 'height' && (
            <motion.div key="height" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm pt-4">
              <h2 className="text-xl font-bold text-foreground mb-1">What's your height?</h2>
              <p className="text-[12px] text-muted-foreground mb-6">This improves accuracy by 23%</p>

              {/* Gender selector — only if not already set */}
              {genderLoaded && !genderSet && (
                <div className="mb-6">
                  <p className="text-[13px] font-bold text-foreground mb-2">I typically shop in the…</p>
                  <div className="flex gap-1.5">
                    {[
                      { value: 'male', label: "Men's section" },
                      { value: 'female', label: "Women's section" },
                      { value: 'non-binary', label: 'Both' },
                    ].map(g => (
                      <button
                        key={g.value}
                        onClick={() => handleGenderSelect(g.value)}
                        className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95 ${
                          genderSet === g.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                  <Ruler className="h-3.5 w-3.5 text-primary" /> Height
                </p>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className={!useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>ft/in</span>
                  <Switch checked={useCm} onCheckedChange={setUseCm} className="scale-[0.8]" />
                  <span className={useCm ? 'text-primary font-bold' : 'text-muted-foreground'}>cm</span>
                </div>
              </div>

              {useCm ? (
                <Input
                  type="number" placeholder="e.g. 175" value={heightCm}
                  onChange={e => setHeightCm(e.target.value)}
                  className={`rounded-xl h-14 text-lg text-center font-bold ${heightTouched && !heightValid ? 'field-error' : ''}`}
                  min={120} max={230}
                />
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="number" placeholder="ft" value={heightFt}
                    onChange={e => setHeightFt(e.target.value)}
                    className={`rounded-xl flex-1 h-14 text-lg text-center font-bold ${heightTouched && !heightValid ? 'field-error' : ''}`}
                    min={4} max={7}
                  />
                  <Input
                    type="number" placeholder="in" value={heightIn}
                    onChange={e => setHeightIn(e.target.value)}
                    className={`rounded-xl flex-1 h-14 text-lg text-center font-bold ${heightTouched && !heightValid ? 'field-error' : ''}`}
                    min={0} max={11}
                  />
                </div>
              )}

              {heightTouched && !heightValid && (
                <p className="field-error-message flex items-center gap-1 mt-2">
                  <AlertTriangle className="h-3 w-3" /> Valid range: 120–230 cm / 4'0"–7'6"
                </p>
              )}

              {/* Reference object */}
              <div className="mt-6">
                <Accordion type="single" collapsible>
                  <AccordionItem value="ref" className="border border-border rounded-xl px-3">
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
                              className={`text-center p-2 rounded-xl border transition-all active:scale-95 min-h-[44px] ${
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
            </motion.div>
          )}

          {/* ─── STEP 3 & 4: FRONT / SIDE CAPTURE ─── */}
          {(flowStep === 'front' || flowStep === 'side') && !reviewing && (
            <motion.div key={flowStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center">
              <h2 className="text-lg font-bold text-foreground mb-0.5">{config.title}</h2>
              <p className="text-[12px] text-muted-foreground text-center mb-3">{config.instruction}</p>

              {/* Viewfinder with enhanced silhouette guide overlay */}
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-card border-2 border-dashed border-border mb-3">
                {photos[captureStep] ? (
                  <img src={photos[captureStep]!} alt={config.title} className="w-full h-full object-cover img-normalize" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground relative">
                    {/* Center crosshair guides */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Vertical center line */}
                      <div className="absolute left-1/2 top-[8%] bottom-[8%] w-px border-l border-dashed border-primary/20" />
                      {/* Horizontal thirds */}
                      <div className="absolute left-[15%] right-[15%] top-[25%] h-px border-t border-dashed border-primary/15" />
                      <div className="absolute left-[15%] right-[15%] top-[75%] h-px border-t border-dashed border-primary/15" />
                    </div>

                    {/* Glowing body silhouette overlay */}
                    <img src={bodySilhouetteGlow} alt="" className="h-[70%] object-contain pointer-events-none opacity-85" />

                    {/* Positioning tips overlaid on corners */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                      <Eye className="h-2.5 w-2.5 text-primary" />
                      <span className="text-[8px] font-bold text-foreground">Head visible</span>
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                      <Sun className="h-2.5 w-2.5 text-primary" />
                      <span className="text-[8px] font-bold text-foreground">Even light</span>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                      <Maximize className="h-2.5 w-2.5 text-primary" />
                      <span className="text-[8px] font-bold text-foreground">Feet visible</span>
                    </div>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                      <Ruler className="h-2.5 w-2.5 text-primary" />
                      <span className="text-[8px] font-bold text-foreground">6-8 ft away</span>
                    </div>

                    {/* Animated guide text */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute bottom-10 text-center"
                    >
                      <p className="text-[11px] font-semibold text-primary/70">
                        {captureStep === 'front' ? 'Align with silhouette · head to feet' : 'Turn 90° · align with silhouette'}
                      </p>
                    </motion.div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground text-center bg-card border border-border px-3 py-1.5 rounded-xl mb-2">
                💡 {config.tip}
              </p>

              {/* Use existing photo link */}
              <button
                onClick={async () => {
                  if (isNativePlatform()) {
                    try {
                      const result = await takeNativePhoto('gallery');
                      const key = flowStep === 'side' ? 'side' : 'front';
                      setPhotos(prev => ({ ...prev, [key]: result.dataUrl }));
                      setReviewing(true);
                      trackEvent(key === 'front' ? 'scan_front_captured' : 'scan_side_captured');
                    } catch { /* cancelled */ }
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="text-[11px] text-primary font-medium flex items-center gap-1 min-h-[44px]"
              >
                <Upload className="h-3 w-3" /> Use existing photo
              </button>
            </motion.div>
          )}

          {/* ─── PHOTO REVIEW ─── */}
          {(flowStep === 'front' || flowStep === 'side') && reviewing && photos[captureStep] && (
            <motion.div key={`review-${flowStep}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm flex flex-col items-center">
              <h2 className="text-base font-bold text-foreground mb-1">Review: {config.title}</h2>
              <p className="text-[11px] text-muted-foreground mb-2">Full body visible and well-lit?</p>
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-border mb-3">
                <img src={photos[captureStep]!} alt={config.title} className="w-full h-full object-cover img-normalize" />
              </div>
              <div className="w-full grid grid-cols-2 gap-1.5 mb-2">
                {['Full body visible', 'Good lighting', 'Correct angle', 'Fitted clothing'].map((label, i) => (
                  <div key={i} className="flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-xl px-2 py-1.5">
                    <Check className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-foreground/80">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── STEP 5: FINAL REVIEW ─── */}
          {flowStep === 'review' && (
            <motion.div key="review-final" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm">
              <h2 className="text-lg font-bold text-foreground mb-1">Ready to Analyze</h2>
              <p className="text-[12px] text-muted-foreground mb-4">Review your inputs before we estimate your measurements.</p>

              <div className="space-y-2 mb-4">
                {checklist.map((c) => (
                  <div key={c.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors min-h-[44px] ${
                    c.done ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'
                  }`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                      c.done ? 'bg-primary' : 'border border-border'
                    }`}>
                      {c.done && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className={`text-[13px] font-medium ${c.done ? 'text-foreground' : 'text-muted-foreground'}`}>{c.label}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {(['front', 'side'] as const).map((key) => (
                  <div key={key} className="relative">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{key} view</p>
                    <div className="aspect-[3/4] rounded-xl overflow-hidden border border-border bg-card">
                      {photos[key] ? (
                        <img src={photos[key]!} alt={`${key} view`} className="w-full h-full object-cover img-normalize" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[11px]">Missing</div>
                      )}
                    </div>
                    {photos[key] && (
                      <button
                        onClick={() => { setPhotos(p => ({ ...p, [key]: null })); setFlowStep(key as FlowStep); }}
                        className="absolute top-6 right-1 bg-card/80 backdrop-blur rounded-lg px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[28px]"
                      >
                        Retake
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 mb-4 min-h-[44px]">
                <Ruler className="h-3.5 w-3.5 text-primary" />
                <span className="text-[12px] text-foreground font-medium">Height: {getHeightCm()} cm</span>
                <button onClick={() => setFlowStep('height')} className="ml-auto text-[10px] text-primary font-medium min-h-[44px] flex items-center">Edit</button>
              </div>

              {refObject !== 'none' && (
                <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 mb-4 min-h-[44px]">
                  <Ruler className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[12px] text-foreground font-medium">Ref: {REFERENCE_OBJECTS[refObject].label}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t border-border/40 px-4 pb-4 pt-3 space-y-2 max-w-sm mx-auto w-full">
        {flowStep === 'intro' && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold uppercase tracking-wider"
              onClick={() => setFlowStep('height')}
            >
              <Camera className="mr-2 h-4 w-4" /> Start Scan
            </Button>
          </motion.div>
        )}

        {flowStep === 'height' && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold"
              disabled={!heightValid}
              onClick={() => setFlowStep('front')}
            >
              Continue to Photos <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {(flowStep === 'front' || flowStep === 'side') && !reviewing && (
          <>
            {photos[captureStep] ? (
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm" onClick={handleRetake}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
                </Button>
                <Button className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm" onClick={() => setReviewing(true)}>
                  Review
                </Button>
              </div>
            ) : (
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button className="w-full h-12 rounded-xl text-sm font-semibold" onClick={handleCapture}>
                  <Camera className="mr-2 h-4 w-4" /> Take {config.title} Photo
                </Button>
              </motion.div>
            )}
          </>
        )}

        {(flowStep === 'front' || flowStep === 'side') && reviewing && (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm" onClick={handleRetake}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
            </Button>
            <Button className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm" onClick={handlePhotoAccept}>
              <Check className="mr-1.5 h-4 w-4" />
              {flowStep === 'front' ? 'Next: Side' : 'Review All'}
            </Button>
          </div>
        )}

        {flowStep === 'review' && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold"
              disabled={!allDone}
              onClick={handleAnalyze}
            >
              Analyze Scan
            </Button>
          </motion.div>
        )}

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Private by default · delete anytime
        </p>
      </div>
    </div>
  );
};

export default Capture;
