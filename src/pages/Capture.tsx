import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, ArrowLeft, RotateCcw, Check, Shield, ChevronRight, Upload, LogIn,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { setGuestMode } from '@/lib/session';
import { CaptureStep, STEP_CONFIG, PhotoSet, ReferenceObject, REFERENCE_OBJECTS } from '@/lib/types';
import CaptureHeightStep from '@/components/capture/CaptureHeightStep';
import CaptureReviewStep from '@/components/capture/CaptureReviewStep';
import { getFitPreference } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';
import { compressPhoto } from '@/lib/imageUtils';
import BottomTabBar from '@/components/BottomTabBar';

type FlowStep = 'intro' | 'height' | 'front' | 'side' | 'review';
const FLOW_STEPS: { key: FlowStep; label: string }[] = [
  { key: 'intro', label: 'Intro' },
  { key: 'height', label: 'Height' },
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'review', label: 'Review' },
];


const SCAN_STATE_KEY = 'dripcheck_scan_state';
const MAX_PERSISTED_PHOTO_LENGTH = 900_000;

type PersistedScanState = {
  flowStep?: FlowStep;
  photos?: PhotoSet;
  hasPhotos?: { front: boolean; side: boolean };
  heightCm?: string;
  heightFt?: string;
  heightIn?: string;
  useCm?: boolean;
  refObject?: ReferenceObject;
};

const sanitizePersistedPhoto = (photo: unknown): string | null => {
  if (typeof photo !== 'string') return null;
  if (!photo.startsWith('data:image/')) return null;
  if (photo.length > MAX_PERSISTED_PHOTO_LENGTH) return null;
  return photo;
};

function loadScanState(): PersistedScanState | null {
  try {
    const raw = sessionStorage.getItem(SCAN_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedScanState;
    return {
      ...parsed,
      photos: {
        front: sanitizePersistedPhoto(parsed?.photos?.front),
        side: sanitizePersistedPhoto(parsed?.photos?.side),
      },
    };
  } catch {
    return null;
  }
}

function saveScanState(state: PersistedScanState) {
  try {
    sessionStorage.setItem(SCAN_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / serialization errors
  }
}

function clearScanState() {
  try {
    sessionStorage.removeItem(SCAN_STATE_KEY);
  } catch {}
}

import ScanPreviewCard from '@/components/ui/ScanPreviewCard';
import bodySilhouetteFrontMask from '@/assets/body-silhouette-mask.png';
import bodySilhouetteSideMask from '@/assets/body-silhouette-side-mask.png';
import CaptureViewfinder from '@/components/capture/CaptureViewfinder';

const Capture = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Scan');
  const saved = loadScanState();
  const [flowStep, setFlowStep] = useState<FlowStep>(saved?.flowStep || 'intro');
  const [photos, setPhotos] = useState<PhotoSet>({
    front: saved?.photos?.front ?? null,
    side: saved?.photos?.side ?? null,
  });
  const [heightCm, setHeightCm] = useState(saved?.heightCm || '');
  const [heightFt, setHeightFt] = useState(saved?.heightFt || '');
  const [heightIn, setHeightIn] = useState(saved?.heightIn || '');
  const [useCm, setUseCm] = useState(saved?.useCm || false);
  const [refObject, setRefObject] = useState<ReferenceObject>(saved?.refObject || 'none');
  const [reviewing, setReviewing] = useState(
    (saved?.flowStep === 'front' && !!saved?.photos?.front) ||
    (saved?.flowStep === 'side' && !!saved?.photos?.side)
  );
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [genderSet, setGenderSet] = useState<string | null>(null);
  const [genderLoaded, setGenderLoaded] = useState(false);
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [webCameraOpen, setWebCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const { toast } = useToast();

  // Load existing gender from profile
  useEffect(() => {
    if (!user) { setGenderLoaded(true); return; }
    supabase.from('profiles').select('gender').eq('user_id', user.id).single().then(({ data }) => {
      if (data) setGenderSet(data.gender || null);
      setGenderLoaded(true);
    });
  }, [user]);

  const handleGenderSelect = async (value: string) => {
    setGenderSet(value);
    if (user) {
      await supabase.rpc('update_own_profile', { p_gender: value });
    }
  };

  useEffect(() => { trackEvent('scan_started'); }, []);
  useEffect(() => {
    if (flowStep === 'intro') {
      clearScanState();
      return;
    }

    saveScanState({
      flowStep,
      photos: {
        front: sanitizePersistedPhoto(photos.front),
        side: sanitizePersistedPhoto(photos.side),
      },
      hasPhotos: { front: !!photos.front, side: !!photos.side },
      heightCm,
      heightFt,
      heightIn,
      useCm,
      refObject,
    });
  }, [flowStep, photos.front, photos.side, heightCm, heightFt, heightIn, useCm, refObject]);

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
  const cameraMaskUrl = captureStep === 'side' ? bodySilhouetteSideMask : bodySilhouetteFrontMask;

  // Safety: if reviewing but photo is missing (e.g. page reload, compress failure), reset
  useEffect(() => {
    if (reviewing && (flowStep === 'front' || flowStep === 'side') && !photos[captureStep]) {
      setReviewing(false);
    }
  }, [reviewing, flowStep, captureStep, photos]);

  const stopWebCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setVideoReady(false);
    setCaptureCountdown(null);
  }, []);

  const handleCapturedPhoto = useCallback(async (rawDataUrl: string, key: keyof PhotoSet) => {
    try {
      const compressed = await compressPhoto(rawDataUrl, 1280, 0.8);
      setPhotos((prev) => ({ ...prev, [key]: compressed }));
    } catch (err) {
      console.error('Photo compress failed, using original:', err);
      setPhotos((prev) => ({ ...prev, [key]: rawDataUrl }));
    }

    setReviewing(true);
    trackEvent(key === 'front' ? 'scan_front_captured' : 'scan_side_captured');
  }, []);

  const openWebCamera = useCallback(async () => {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setVideoReady(false);
      setWebCameraOpen(true);
    } catch (err) {
      console.error('Web camera access failed, falling back to file input:', err);
      toast({
        title: 'Camera unavailable',
        description: 'Opening your device camera picker instead.',
        variant: 'destructive',
      });
      cameraInputRef.current?.click();
    }
  }, [toast]);

  useEffect(() => () => stopWebCamera(), [stopWebCamera]);

  useEffect(() => {
    if (!webCameraOpen) {
      stopWebCamera();
      return;
    }

    const video = videoRef.current;
    const stream = mediaStreamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const markReady = () => {
      setVideoReady(true);
      setCameraError(null);
      void video.play().catch(() => undefined);
    };

    video.onloadedmetadata = markReady;
    video.oncanplay = markReady;
    void video.play().then(() => {
      setVideoReady(true);
      setCameraError(null);
    }).catch(() => undefined);

    return () => {
      video.onloadedmetadata = null;
      video.oncanplay = null;
    };
  }, [webCameraOpen, stopWebCamera]);

  useEffect(() => {
    if (!webCameraOpen || videoReady) return;

    const timeoutId = window.setTimeout(() => {
      setCameraError('Live camera preview did not start. Try again or choose from gallery.');
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [webCameraOpen, videoReady]);

  const handleWebCameraCapture = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      toast({
        title: 'Camera still loading',
        description: 'Wait a moment for preview to appear, or use gallery.',
        variant: 'destructive',
      });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const key: keyof PhotoSet = flowStep === 'side' ? 'side' : 'front';

    setWebCameraOpen(false);
    stopWebCamera();
    await handleCapturedPhoto(dataUrl, key);
  };

  const handleCapture = async () => {
    const key: keyof PhotoSet = flowStep === 'side' ? 'side' : 'front';

    if (isNativePlatform()) {
      try {
        const result = await takeNativePhoto('camera');
        await handleCapturedPhoto(result.dataUrl, key);
      } catch (err: any) {
        if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) return;
        console.error('Native camera error:', err);
      }
      return;
    }

    await openWebCamera();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWebCameraOpen(false);
    stopWebCamera();
    setCameraError(null);

    const key: keyof PhotoSet = flowStep === 'side' ? 'side' : 'front';
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result;
      if (typeof base64 !== 'string') {
        e.target.value = '';
        return;
      }

      await handleCapturedPhoto(base64, key);
      e.target.value = '';
    };

    reader.readAsDataURL(file);
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
    if (flowStep === 'intro') {
      if (window.history.length > 1) navigate(-1);
      else navigate('/', { replace: true });
    }
    else if (flowStep === 'height') setFlowStep('intro');
    else if (flowStep === 'front') setFlowStep('height');
    else if (flowStep === 'side') setFlowStep('front');
    else setFlowStep('side');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-safe-tab">
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
                  className={`text-[11px] mt-1 font-semibold ${
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

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-4 pt-2 overflow-y-auto pb-4">
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: INTRO ─── */}
          {flowStep === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center text-center pt-4">
              <ScanPreviewCard height={300} animated />

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
                    <span className="h-7 w-7 badge-gold-3d rounded-lg flex items-center justify-center text-sm shrink-0">{item.emoji}</span>
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
                <div className="h-7 w-7 badge-gold-3d shimmer-sweep rounded-lg shrink-0 mt-0.5 flex items-center justify-center">
                  <Shield className="h-3.5 w-3.5 text-primary-foreground" />
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
            <CaptureHeightStep
              heightCm={heightCm} heightFt={heightFt} heightIn={heightIn}
              useCm={useCm} heightValid={heightValid} heightTouched={heightTouched}
              refObject={refObject} genderLoaded={genderLoaded} genderSet={genderSet}
              onHeightCmChange={setHeightCm} onHeightFtChange={setHeightFt} onHeightInChange={setHeightIn}
              onUseCmChange={setUseCm} onRefObjectChange={setRefObject} onGenderSelect={handleGenderSelect}
            />
          )}

          {/* ─── STEP 3 & 4: FRONT / SIDE CAPTURE ─── */}
          {(flowStep === 'front' || flowStep === 'side') && !reviewing && (
            <motion.div key={flowStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center">
              <h2 className="text-lg font-bold text-foreground mb-0.5">{config.title}</h2>
              <p className="text-[12px] text-muted-foreground text-center mb-3">{config.instruction}</p>

              <CaptureViewfinder captureStep={captureStep} photo={photos[captureStep]} />

              <p className="text-[11px] text-muted-foreground text-center bg-card border border-border px-3 py-1.5 rounded-xl mb-2 flex items-center justify-center gap-1.5">
                <span className="h-5 w-5 badge-gold-3d rounded-md flex items-center justify-center text-[10px] shrink-0">💡</span>
                {config.tip}
              </p>

              {/* Use existing photo link */}
              <button
                onClick={async () => {
                  const key: keyof PhotoSet = flowStep === 'side' ? 'side' : 'front';

                  if (isNativePlatform()) {
                    try {
                      const result = await takeNativePhoto('gallery');
                      await handleCapturedPhoto(result.dataUrl, key);
                    } catch (err: any) {
                      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) return;
                      console.error('Gallery pick error:', err);
                    }
                  } else {
                    galleryInputRef.current?.click();
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
            <CaptureReviewStep
              photos={photos}
              checklist={checklist}
              heightCm={getHeightCm()}
              refObject={refObject}
              onRetake={(key) => { setPhotos(p => ({ ...p, [key]: null })); setFlowStep(key as FlowStep); }}
              onEditHeight={() => setFlowStep('height')}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t border-border/40 px-4 pb-4 pt-3 space-y-2 w-full">
        {flowStep === 'intro' && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold uppercase tracking-wider"
              onClick={() => {
                if (!user) {
                  setAuthSheetOpen(true);
                } else {
                  setFlowStep('height');
                }
              }}
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

      <Sheet
        open={webCameraOpen}
        onOpenChange={(open) => {
          setWebCameraOpen(open);
          if (!open) stopWebCamera();
        }}
      >
        <SheetContent side="bottom" className="h-[100svh] rounded-none p-0 border-none">
          <div className="flex h-full flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Take {config.title} Photo</p>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setWebCameraOpen(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative flex-1 overflow-hidden bg-muted">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`h-full w-full object-cover transition-opacity duration-200 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Guide overlay */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0">
                  <div className="absolute left-1/2 top-[8%] bottom-[8%] w-px -translate-x-1/2 bg-primary/20" />
                  <div className="absolute left-[15%] right-[15%] top-[25%] h-px bg-primary/20" />
                  <div className="absolute left-[15%] right-[15%] top-[75%] h-px bg-primary/20" />
                </div>

                <div className="absolute inset-y-[8%] inset-x-[18%]">
                  <div
                    className={`h-full w-full rounded-full transition-opacity duration-200 ${videoReady ? 'opacity-60' : 'opacity-90'}`}
                    style={{
                      backgroundImage: 'linear-gradient(180deg, hsl(var(--primary) / 0.55) 0%, hsl(var(--primary) / 0.25) 55%, hsl(var(--primary) / 0.45) 100%)',
                      WebkitMaskImage: `url(${cameraMaskUrl})`,
                      maskImage: `url(${cameraMaskUrl})`,
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                    } as React.CSSProperties}
                  />
                </div>
              </div>

              {!videoReady && (
                <div className="absolute inset-x-4 top-4 rounded-xl border border-border bg-background/90 px-3 py-2 text-center backdrop-blur-sm">
                  <p className="text-[11px] font-medium text-foreground">
                    {cameraError ?? 'Starting camera preview...'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-border px-4 py-4">
              <Button className="h-12 w-full rounded-xl text-sm font-semibold" onClick={handleWebCameraCapture}>
                <Camera className="mr-2 h-4 w-4" /> Capture Photo
              </Button>
              <Button variant="secondary" className="h-11 w-full rounded-xl text-sm font-semibold" onClick={() => galleryInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Choose from Gallery
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Auth guard sheet */}
      <Sheet open={authSheetOpen} onOpenChange={setAuthSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-base font-bold">Sign in to save your measurements</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Your scan results will be saved to your profile and used for size recommendations.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2">
            <Button
              className="w-full h-11 rounded-xl text-sm font-semibold"
              onClick={() => {
                setAuthSheetOpen(false);
                navigate('/auth?returnTo=/capture');
              }}
            >
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl text-sm font-semibold"
              onClick={() => {
                setAuthSheetOpen(false);
                setGuestMode();
                setFlowStep('height');
                toast({
                  title: "Scan results won't be saved without an account",
                  variant: 'destructive',
                });
              }}
            >
              Continue as Guest
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <BottomTabBar />
    </div>
  );
};

export default Capture;
