import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, ArrowLeft, RotateCcw, Check, Shield, ChevronRight, Upload, LogIn, Shirt, LayoutGrid,
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
const MAX_PERSISTED_PHOTO_LENGTH = 2_500_000;

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

import BiometricScanShowcase from '@/components/ui/BiometricScanShowcase';
import bodySilhouetteFrontMask from '@/assets/body-silhouette-mask.png';
import bodySilhouetteSideMask from '@/assets/body-silhouette-side-mask.png';
import CaptureViewfinder from '@/components/capture/CaptureViewfinder';

const Capture = () => {
  const navigate = useNavigate();
  const { user, isSubscribed, userGender, genderLoaded: authGenderLoaded, updateGender } = useAuth();
  usePageMeta({ title: 'Body Scan', description: 'Get your exact body measurements from 2 photos in under 60 seconds with AI-powered scanning.', path: '/capture' });
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
  const genderLoaded = authGenderLoaded;
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [webCameraOpen, setWebCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [scanGated, setScanGated] = useState(false);
  const { toast } = useToast();

  // Sync gender from auth context
  useEffect(() => {
    if (authGenderLoaded) setGenderSet(userGender);
  }, [userGender, authGenderLoaded]);

  // Check scan gate: non-founder/non-premium users limited to 1 scan
  useEffect(() => {
    if (!user || isSubscribed) { setScanGated(false); return; }
    Promise.all([
      supabase.rpc('has_role', { _user_id: user.id, _role: 'founder' as any }),
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' as any }),
      supabase.from('body_scans').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]).then(([founderRes, adminRes, scanRes]) => {
      const isFounder = !!founderRes.data;
      const isAdmin = !!adminRes.data;
      const scanCount = scanRes.count ?? 0;
      setScanGated(!isFounder && !isAdmin && scanCount >= 1);
    });
  }, [user, isSubscribed]);

  const handleGenderSelect = async (value: string) => {
    setGenderSet(value);
    updateGender(value);
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
      setCameraError('Live preview unavailable on this browser. Use Capture Photo to open camera app.');
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [webCameraOpen, videoReady]);

  const handleWebCameraCapture = useCallback(async () => {
    setCaptureCountdown(null);

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
  }, [flowStep, handleCapturedPhoto, stopWebCamera, toast]);

  const startTimedWebCapture = () => {
    if (captureCountdown !== null) return;

    if (!videoReady) {
      cameraInputRef.current?.click();
      return;
    }

    setCaptureCountdown(3);
  };

  useEffect(() => {
    if (captureCountdown === null) return;

    if (captureCountdown <= 0) {
      void handleWebCameraCapture();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCaptureCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [captureCountdown, handleWebCameraCapture]);

  /** Detect mobile via UA + touch — simple and synchronous */
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 768);

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

    // Mobile web → go straight to native camera app (no getUserMedia)
    if (isMobileDevice) {
      cameraInputRef.current?.click();
      return;
    }

    // Desktop → use in-app live preview
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

      // Persist raw photo to sessionStorage immediately (survives browser reload from camera handoff)
      try {
        const currentState = loadScanState() || {};
        const updatedPhotos = { ...currentState.photos, [key]: base64.length <= MAX_PERSISTED_PHOTO_LENGTH ? base64 : null };
        saveScanState({ ...currentState, flowStep, photos: updatedPhotos as PhotoSet });
      } catch { /* ignore quota errors */ }

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
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-0 h-14">
          {/* Back arrow */}
          <Button variant="ghost" size="icon" onClick={goBack} className="h-8 w-8 rounded-xl min-h-[44px] min-w-[44px] shrink-0" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Numbered circle stepper */}
          <div className="flex items-center justify-between flex-1">
            {FLOW_STEPS.map((s, i) => {
              const completed = i < flowIdx;
              const active = i === flowIdx;
              return (
                <div key={s.key} className="flex flex-col items-center flex-1 relative">
                  {i > 0 && (
                    <div
                      className={`absolute top-[14px] right-1/2 w-full h-[1.5px] -z-10 transition-colors ${
                        i <= flowIdx ? 'bg-primary/40' : 'bg-white/10'
                      }`}
                    />
                  )}
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] transition-all shrink-0 backdrop-blur-sm ${
                      completed
                        ? 'bg-primary/10 border border-primary/30 text-primary'
                        : active
                          ? 'bg-primary/10 border border-primary/30 text-primary font-semibold'
                          : 'bg-white/5 border border-white/10 text-white/40'
                    }`}
                  >
                    {completed ? <Check className="h-3.5 w-3.5 text-primary" /> : i + 1}
                  </div>
                  <span
                    className={`type-label mt-1 ${
                      completed || active ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-4 pt-1 overflow-y-auto pb-28">
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: INTRO ─── */}
          {flowStep === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center text-center">
              <BiometricScanShowcase height={220} />

              <h2 className="type-headline mt-2 mb-0.5 uppercase">
                Your Biometric Scan.
              </h2>
              <p className="type-body mb-3" style={{ fontSize: 12 }}>AI-powered measurements in under 60 seconds</p>

              <div className="w-full space-y-1 text-left">
                {[
                  { icon: Camera, text: '2 photos — front & side' },
                  { icon: Shirt, text: 'Wear fitted clothing' },
                  { icon: LayoutGrid, text: 'Plain background, good light' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-center gap-3 glass-dark rounded-xl px-3 py-1.5"
                  >
                    <item.icon className="h-4 w-4 text-primary/60 shrink-0" />
                    <span className="type-body" style={{ fontSize: 12 }}>{item.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Privacy trust panel */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="w-full glass-dark border-l-2 border-l-primary/30 rounded-xl px-3 py-2 mt-2 flex items-start gap-3"
              >
                <Shield className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                <div>
                  <p className="type-body font-semibold text-foreground leading-tight mb-0.5" style={{ fontSize: 12 }}>On-device processing</p>
                  <p className="type-body leading-relaxed" style={{ fontSize: 11 }}>
                    Photos never leave your device without permission.
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
            <motion.div key={flowStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center mt-auto">
              <p className="type-body text-center mb-1.5" style={{ fontSize: 12 }}>{config.instruction}</p>

              <CaptureViewfinder captureStep={captureStep} photo={photos[captureStep]} />

              <div className="flex items-center gap-3 mb-1">
                <p className="text-[11px] text-white/50 text-center glass-dark px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5">
                  <span className="text-primary/60 text-xs shrink-0">💡</span>
                  {config.tip}
                </p>
              </div>

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
                className="text-[12px] text-primary font-medium flex items-center gap-1 min-h-[44px]"
              >
                <Upload className="h-3 w-3" /> Upload from gallery
              </button>
            </motion.div>
          )}

          {/* ─── PHOTO REVIEW ─── */}
          {(flowStep === 'front' || flowStep === 'side') && reviewing && photos[captureStep] && (
            <motion.div key={`review-${flowStep}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm flex flex-col items-center">
              <h2 className="type-headline text-base mb-1">Check Your {config.title}</h2>
              <p className="type-body mb-2" style={{ fontSize: 11 }}>Head to toe visible · good lighting?</p>
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-white/10 mb-3">
                <img src={photos[captureStep]!} alt={config.title} className="w-full h-full object-cover img-normalize" />
              </div>
              <div className="w-full grid grid-cols-2 gap-1.5 mb-2">
                {['Full body', 'Good light', 'Right angle', 'Fitted clothes'].map((label, i) => (
                  <div key={i} className="flex items-center gap-1 glass-gold rounded-xl px-2 py-1.5">
                    <Check className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-white/70">{label}</span>
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-4 pt-3 space-y-2" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
        {flowStep === 'intro' && (
          scanGated ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 w-full">
              <div className="bg-primary/8 backdrop-blur-md border border-primary/20 rounded-xl p-4 text-center">
                <p className="type-headline text-sm text-primary mb-1" style={{ fontSize: 14 }}>Scan limit reached</p>
                <p className="type-body" style={{ fontSize: 12 }}>Free accounts get 1 body scan. Upgrade to Premium or enter a Founder Access Code for unlimited scans.</p>
              </div>
              <Button className="w-full h-12 rounded-xl text-sm font-semibold btn-luxury" onClick={() => navigate('/premium')}>
                Upgrade to Premium
              </Button>
            </motion.div>
          ) : (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold uppercase tracking-wider btn-luxury"
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
          )
        )}

        {flowStep === 'height' && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold btn-luxury"
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
                <Button variant="secondary" className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm bg-white/5 border border-white/10 text-white hover:bg-white/10" onClick={handleRetake}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
                </Button>
                <Button className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm btn-luxury" onClick={() => setReviewing(true)}>
                  Review
                </Button>
              </div>
            ) : (
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button className="w-full h-12 rounded-xl text-sm font-semibold btn-luxury" onClick={handleCapture}>
                  <Camera className="mr-2 h-4 w-4" /> Take {config.title} Photo
                </Button>
              </motion.div>
            )}
          </>
        )}

        {(flowStep === 'front' || flowStep === 'side') && reviewing && (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm bg-white/5 border border-white/10 text-white hover:bg-white/10" onClick={handleRetake}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
            </Button>
            <Button className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm btn-luxury" onClick={handlePhotoAccept}>
              <Check className="mr-1.5 h-4 w-4" />
              {flowStep === 'front' ? 'Next: Side' : 'Review All'}
            </Button>
          </div>
        )}

        {flowStep === 'review' && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              className="w-full h-12 rounded-xl text-sm font-semibold btn-luxury"
              disabled={!allDone}
              onClick={handleAnalyze}
            >
              Analyze Scan
            </Button>
          </motion.div>
        )}

        <p className="type-data text-center flex items-center justify-center gap-1">
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
          <SheetHeader className="sr-only">
            <SheetTitle>Take {config.title} Photo</SheetTitle>
            <SheetDescription>Use your live camera preview to capture this scan photo. If preview is unavailable, use camera app fallback.</SheetDescription>
          </SheetHeader>

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
              <Button
                className="h-12 w-full rounded-xl text-sm font-semibold"
                onClick={startTimedWebCapture}
                disabled={captureCountdown !== null}
              >
                <Camera className="mr-2 h-4 w-4" />
                {captureCountdown !== null
                  ? `Capturing in ${captureCountdown}s`
                  : videoReady
                    ? 'Capture Photo (3s Timer)'
                    : 'Open Camera App'}
              </Button>

              {!videoReady && (
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl text-sm font-semibold"
                  onClick={openWebCamera}
                  disabled={captureCountdown !== null}
                >
                  Retry Live Preview
                </Button>
              )}

              <Button
                variant="secondary"
                className="h-11 w-full rounded-xl text-sm font-semibold"
                onClick={() => galleryInputRef.current?.click()}
                disabled={captureCountdown !== null}
              >
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
