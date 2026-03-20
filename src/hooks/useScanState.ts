import { useState, useRef, useEffect, useCallback } from 'react';
import { CaptureStep, STEP_CONFIG, PhotoSet, ReferenceObject } from '@/lib/types';
import { compressPhoto } from '@/lib/imageUtils';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';

type FlowStep = 'intro' | 'height' | 'front' | 'side' | 'review';

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

export type { FlowStep, PersistedScanState };
export { loadScanState, saveScanState, clearScanState, sanitizePersistedPhoto, MAX_PERSISTED_PHOTO_LENGTH };

export const FLOW_STEPS: { key: FlowStep; label: string }[] = [
  { key: 'intro', label: 'Intro' },
  { key: 'height', label: 'Height' },
  { key: 'front', label: 'Front' },
  { key: 'side', label: 'Side' },
  { key: 'review', label: 'Review' },
];

/**
 * Manages scan state: flow step, photos, height, reference object, and camera logic.
 */
export function useScanState() {
  const saved = loadScanState();
  const { toast } = useToast();

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

  const [webCameraOpen, setWebCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);

  // Persist scan state on changes
  useEffect(() => {
    if (flowStep === 'intro') { clearScanState(); return; }
    saveScanState({
      flowStep,
      photos: {
        front: sanitizePersistedPhoto(photos.front),
        side: sanitizePersistedPhoto(photos.side),
      },
      hasPhotos: { front: !!photos.front, side: !!photos.side },
      heightCm, heightFt, heightIn, useCm, refObject,
    });
  }, [flowStep, photos.front, photos.side, heightCm, heightFt, heightIn, useCm, refObject]);

  const captureStep: CaptureStep = flowStep === 'side' ? 'side' : 'front';
  const config = STEP_CONFIG[captureStep];
  const flowIdx = FLOW_STEPS.findIndex(s => s.key === flowStep);

  const getHeightCm = (): number => {
    if (useCm) return parseFloat(heightCm) || 0;
    return Math.round(((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0)) * 2.54);
  };

  const heightValid = getHeightCm() >= 120 && getHeightCm() <= 230;
  const heightTouched = !!(heightCm || heightFt || heightIn);

  // Safety: if reviewing but photo is missing, reset
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
    if (videoRef.current) { videoRef.current.srcObject = null; }
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
      console.error('Web camera access failed:', err);
      toast({ title: 'Camera unavailable', description: 'Opening your device camera picker instead.', variant: 'destructive' });
      cameraInputRef.current?.click();
    }
  }, [toast]);

  useEffect(() => () => stopWebCamera(), [stopWebCamera]);

  // Video stream lifecycle
  useEffect(() => {
    if (!webCameraOpen) { stopWebCamera(); return; }
    const video = videoRef.current;
    const stream = mediaStreamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    const markReady = () => { setVideoReady(true); setCameraError(null); void video.play().catch(() => undefined); };
    video.onloadedmetadata = markReady;
    video.oncanplay = markReady;
    void video.play().then(() => { setVideoReady(true); setCameraError(null); }).catch(() => undefined);
    return () => { video.onloadedmetadata = null; video.oncanplay = null; };
  }, [webCameraOpen, stopWebCamera]);

  // Camera error timeout
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
      toast({ title: 'Camera still loading', description: 'Wait a moment for preview to appear, or use gallery.', variant: 'destructive' });
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
    if (!videoReady) { cameraInputRef.current?.click(); return; }
    setCaptureCountdown(3);
  };

  // Countdown timer
  useEffect(() => {
    if (captureCountdown === null) return;
    if (captureCountdown <= 0) { void handleWebCameraCapture(); return; }
    const timeoutId = window.setTimeout(() => {
      setCaptureCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [captureCountdown, handleWebCameraCapture]);

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
    if (isMobileDevice) { cameraInputRef.current?.click(); return; }
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
      if (typeof base64 !== 'string') { e.target.value = ''; return; }
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

  const goBack = (navigate: (to: number | string, opts?: any) => void) => {
    if (flowStep === 'intro') {
      if (window.history.length > 1) navigate(-1);
      else navigate('/', { replace: true });
    }
    else if (flowStep === 'height') setFlowStep('intro');
    else if (flowStep === 'front') setFlowStep('height');
    else if (flowStep === 'side') setFlowStep('front');
    else setFlowStep('side');
  };

  return {
    flowStep, setFlowStep,
    photos, setPhotos,
    heightCm, setHeightCm, heightFt, setHeightFt, heightIn, setHeightIn,
    useCm, setUseCm,
    refObject, setRefObject,
    reviewing, setReviewing,
    cameraInputRef, galleryInputRef, videoRef,
    webCameraOpen, setWebCameraOpen,
    videoReady, cameraError, captureCountdown,
    captureStep, config, flowIdx,
    getHeightCm, heightValid, heightTouched,
    stopWebCamera, handleCapturedPhoto, openWebCamera,
    handleWebCameraCapture, startTimedWebCapture,
    handleCapture, handleFileChange,
    handlePhotoAccept, handleRetake, goBack,
    clearScanState,
  };
}
