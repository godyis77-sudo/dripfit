import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoSet, BodyScanResult, FitPreference, ReferenceObject, MeasurementRange } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressPhoto } from '@/lib/imageUtils';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

const MESSAGES = [
  'Detecting body landmarks…',
  'Cross-referencing views…',
  'Estimating measurements…',
  'Matching size charts…',
  'Generating recommendations…',
];

const TOTAL_SCAN_TIME = 8000;
const REVEAL_ORDER = ['height', 'shoulder', 'chest', 'bust', 'waist', 'hips', 'inseam'];

interface AnalyzeState {
  photos: PhotoSet;
  heightCm: number;
  referenceObject: ReferenceObject;
  fitPreference: FitPreference;
}

const Analyze = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as AnalyzeState | undefined;
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [revealedKeys, setRevealedKeys] = useState<string[]>([]);
  const [realData, setRealData] = useState<any>(null);
  const [showVideoPlayFallback, setShowVideoPlayFallback] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const minTimeElapsed = useRef(false);
  const resultReady = useRef<any>(null);
  const effectRan = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const revealTimers = useRef<number[]>([]);

  const attemptPlayVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;

    // Force autoplay-friendly flags at runtime for stricter mobile browsers
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('webkit-playsinline', '');

    try {
      await video.play();
      setShowVideoPlayFallback(false);
      setVideoFailed(false);
      return true;
    } catch (e) {
      console.warn('[video] play() rejected:', e);
      return false;
    }
  }, []);

  // Retry autoplay with increasing delays before showing manual fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let retryTimer: number | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 4;
    const RETRY_DELAYS = [200, 500, 1000, 2000];

    const tryAutoplay = async () => {
      if (cancelled) return;
      const didPlay = await attemptPlayVideo();
      if (cancelled || didPlay) return;

      attempts += 1;
      if (attempts < MAX_ATTEMPTS) {
        retryTimer = window.setTimeout(() => {
          void tryAutoplay();
        }, RETRY_DELAYS[attempts] || 1000);
      } else if (video.paused) {
        setShowVideoPlayFallback(true);
      }
    };

    // Wait for DOM to settle, then try
    retryTimer = window.setTimeout(() => {
      void tryAutoplay();
    }, 100);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void tryAutoplay();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also listen for any user interaction on the page to auto-trigger play
    const handleUserGesture = () => {
      if (video.paused) {
        void attemptPlayVideo();
      }
    };
    document.addEventListener('touchstart', handleUserGesture, { once: true });
    document.addEventListener('click', handleUserGesture, { once: true });

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleUserGesture);
      document.removeEventListener('click', handleUserGesture);
    };
  }, [attemptPlayVideo]);

  useEffect(() => {
    if (!state?.photos?.front || !state?.photos?.side) {
      navigate('/capture', { replace: true });
      return;
    }

    // Guard: only run once (adding deps for correctness but preventing re-execution)
    if (effectRan.current) return;
    effectRan.current = true;

    const msgInterval = setInterval(() => setMsgIdx(p => (p + 1) % MESSAGES.length), 2000);

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + (90 / (TOTAL_SCAN_TIME / 100)), 90));
    }, 100);


    const revealInterval = TOTAL_SCAN_TIME / REVEAL_ORDER.length;
    revealTimers.current = REVEAL_ORDER.map((key, i) =>
      window.setTimeout(() => {
        setRevealedKeys(prev => [...prev, key]);
      }, revealInterval * (i + 0.5))
    );

    setTimeout(() => {
      minTimeElapsed.current = true;
      if (resultReady.current) navigateToResults(resultReady.current);
    }, TOTAL_SCAN_TIME);

    analyzePhotos();

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
      revealTimers.current.forEach(id => window.clearTimeout(id));
      revealTimers.current = [];
    };
  }, [state, navigate, user]);

  const saveToDatabase = async (data: any) => {
    if (!user) return;
    try {
      const { error: dbError } = await supabase.from('body_scans').insert({
        user_id: user.id,
        session_id: null,
        height_cm: data.heightCm || state?.heightCm || 0,
        chest_min: data.chest?.min ?? 0,
        chest_max: data.chest?.max ?? 0,
        waist_min: data.waist?.min ?? 0,
        waist_max: data.waist?.max ?? 0,
        hip_min: data.hips?.min ?? 0,
        hip_max: data.hips?.max ?? 0,
        inseam_min: data.inseam?.min ?? 0,
        inseam_max: data.inseam?.max ?? 0,
        shoulder_min: data.shoulder?.min ?? 0,
        shoulder_max: data.shoulder?.max ?? 0,
        bust_min: data.bust?.min ?? 0,
        bust_max: data.bust?.max ?? 0,
        sleeve_min: data.sleeve?.min ?? 0,
        sleeve_max: data.sleeve?.max ?? 0,
        confidence: data.confidence || 'medium',
        recommended_size: data.recommendedSize || null,
        reference_object: state?.referenceObject || null,
        front_photo_used: !!state?.photos?.front,
        side_photo_used: !!state?.photos?.side,
      });
      if (dbError) console.error('Failed to save scan:', dbError);
    } catch (e) {
      console.error('Error saving scan to profile:', e);
    }
  };

  const navigateToResults = (data: any) => {
    setRealData(data);
    setProgress(100);
    setRevealedKeys(REVEAL_ORDER);
    saveToDatabase(data);
    const scanResult = { id: crypto.randomUUID(), date: new Date().toISOString(), ...data };
    setTimeout(() => {
      navigate('/scan-success', {
        state: { result: scanResult },
        replace: true,
      });
    }, 800);
  };

  const analyzePhotos = async () => {
    try {
      const [compressedFront, compressedSide] = await Promise.all([
        compressPhoto(state!.photos.front!),
        compressPhoto(state!.photos.side!),
      ]);

      const { data: resp, error: fnError } = await supabase.functions.invoke('analyze-body', {
        body: {
          frontPhoto: compressedFront,
          sidePhoto: compressedSide,
          heightCm: state!.heightCm,
          referenceObject: state!.referenceObject,
          fitPreference: state!.fitPreference,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;

      // Store real data so labels update with actual values
      setRealData(payload);

      if (minTimeElapsed.current) {
        navigateToResults(payload);
      } else {
        resultReady.current = payload;
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Analysis failed.');
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <div className="h-12 w-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1.5">Scan Failed</h2>
        <p className="text-[13px] text-muted-foreground text-center mb-5 max-w-[240px]">{error}</p>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button onClick={() => navigate('/capture', { replace: true })} className="rounded-xl h-12 px-6 text-sm font-semibold">
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-50 text-muted-foreground"
        onClick={() => navigate('/capture', { replace: true })}
      >
        Cancel scan
      </Button>
      {/* Animated body silhouette with live measurement overlays */}
      <div className="relative mb-5 w-full max-w-[380px] aspect-[2/3] rounded-xl overflow-hidden bg-background">
        {/* Static silhouette fallback (always visible behind video) */}
        <img
          src={bodySilhouette}
          alt=""
          className="absolute inset-0 w-full h-full object-contain opacity-40 mix-blend-luminosity"
        />
        {/* Scan animation video */}
        <video
          ref={videoRef}
          src="/videos/body-scan-animation.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={() => { void attemptPlayVideo(); }}
          onCanPlay={() => { void attemptPlayVideo(); }}
          onCanPlayThrough={() => { void attemptPlayVideo(); }}
          onLoadedData={() => { void attemptPlayVideo(); }}
          onPlay={() => {
            setShowVideoPlayFallback(false);
            setVideoFailed(false);
          }}
          onError={(e) => {
            console.error('[video] error event:', e);
            setVideoFailed(true);
            setShowVideoPlayFallback(false);
          }}
          className="absolute inset-0 w-full h-full object-contain z-[1]"
        />

        {showVideoPlayFallback && !videoFailed ? (
          <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center">
            <Button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                if (video) {
                  video.muted = true;
                  video.play().then(() => {
                    setShowVideoPlayFallback(false);
                  }).catch(err => console.warn('[video] manual play failed:', err));
                }
              }}
              className="rounded-xl h-10 px-4 text-xs font-semibold shadow-lg"
            >
              Tap to play scan animation
            </Button>
          </div>
        ) : null}

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ boxShadow: 'inset 0 0 60px 20px hsl(var(--background) / 0.7), inset 0 0 120px 40px hsl(var(--background) / 0.4)' }}
        />
        {/* Outer gold border glow */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{ boxShadow: '0 0 20px 2px hsl(var(--primary) / 0.25), 0 0 50px 8px hsl(var(--primary) / 0.1)' }}
        />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">Analyzing Your Scan</h2>

      <motion.p
        key={msgIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-muted-foreground text-center mb-6"
      >
        {MESSAGES[msgIdx]}
      </motion.p>

      {/* Progress bar */}
      <div className="w-full max-w-[240px] h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Measurement count */}
      <p className="text-xs text-muted-foreground mt-3">
        {revealedKeys.length} of {REVEAL_ORDER.length} measurements found
      </p>
    </div>
  );
};

export default Analyze;
