import { useState, useMemo, useEffect, useCallback } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Check, ChevronRight, Upload, LogIn } from 'lucide-react';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { setGuestMode, getFitPreference } from '@/lib/session';
import { PhotoSet } from '@/lib/types';
import CaptureHeightStep from '@/components/capture/CaptureHeightStep';
import CaptureReviewStep from '@/components/capture/CaptureReviewStep';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';
import BottomTabBar from '@/components/BottomTabBar';
import DecorativeSilhouette from '@/components/ui/DecorativeSilhouette';
import bodySilhouetteFrontMask from '@/assets/body-silhouette-mask.png';
import bodySilhouetteSideMask from '@/assets/body-silhouette-side-mask.png';
import CaptureViewfinder from '@/components/capture/CaptureViewfinder';
import { useScanState, FLOW_STEPS } from '@/hooks/useScanState';

const Capture = () => {
  const navigate = useNavigate();
  const { user, isSubscribed, userGender, genderLoaded: authGenderLoaded, updateGender } = useAuth();
  usePageTitle('Scan');
  const { toast } = useToast();
  const scan = useScanState();

  const [genderSet, setGenderSet] = useState<string | null>(null);
  const genderLoaded = authGenderLoaded;
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const [scanGated, setScanGated] = useState(false);

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

  const checklist = useMemo(() => [
    { label: 'Height entered', done: scan.heightValid },
    { label: 'Front photo', done: !!scan.photos.front },
    { label: 'Side photo', done: !!scan.photos.side },
  ], [scan.heightValid, scan.photos.front, scan.photos.side]);

  const allDone = checklist.every(c => c.done);
  const cameraMaskUrl = scan.captureStep === 'side' ? bodySilhouetteSideMask : bodySilhouetteFrontMask;

  const handleAnalyze = () => {
    scan.clearScanState();
    trackEvent('scan_completed');
    navigate('/analyze', {
      state: {
        photos: scan.photos,
        heightCm: scan.getHeightCm(),
        referenceObject: scan.refObject,
        fitPreference: getFitPreference(),
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-safe-tab">
      {/* Header */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-0 h-14">
          <Button variant="ghost" size="icon" onClick={() => scan.goBack(navigate)} className="h-8 w-8 rounded-xl min-h-[44px] min-w-[44px] shrink-0" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-between flex-1">
            {FLOW_STEPS.map((s, i) => {
              const completed = i < scan.flowIdx;
              const active = i === scan.flowIdx;
              return (
                <div key={s.key} className="flex flex-col items-center flex-1 relative">
                  {i > 0 && (
                    <div className={`absolute top-[14px] right-1/2 w-full h-[2px] -z-10 transition-colors ${i <= scan.flowIdx ? 'bg-primary' : 'bg-border'}`} />
                  )}
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shrink-0 ${completed || active ? 'btn-luxury !p-0' : 'border border-border text-muted-foreground'}`}>
                    {completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[11px] mt-1 font-semibold ${completed || active ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <input ref={scan.cameraInputRef} type="file" accept="image/*" capture="environment" onChange={scan.handleFileChange} className="hidden" />
      <input ref={scan.galleryInputRef} type="file" accept="image/*" onChange={scan.handleFileChange} className="hidden" />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-4 pt-1 overflow-y-auto pb-4">
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: INTRO ─── */}
          {scan.flowStep === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center text-center pt-4">
              <DecorativeSilhouette height={300} />
              <h2 className="text-xl font-bold text-foreground mt-6 mb-2">Get your exact measurements in 60 seconds</h2>
              <div className="w-full space-y-2 mt-4 text-left">
                {[
                  { icon: 'scan' as const, text: 'Take 2 photos (front + side)' },
                  { icon: 'shirt' as const, text: 'Wear form-fitting clothes' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 min-h-[44px]">
                    <span className="h-7 w-7 badge-gold-3d rounded-lg flex items-center justify-center shrink-0"><FeatureIcon name={item.icon} size={16} /></span>
                    <span className="text-[13px] font-medium text-foreground">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="w-full bg-card border border-border rounded-xl px-4 py-3 mt-5 flex items-start gap-3">
                <div className="h-7 w-7 badge-gold-3d shimmer-sweep rounded-lg shrink-0 mt-0.5 flex items-center justify-center"><FeatureIcon name="shield" size={16} /></div>
                <div>
                  <p className="text-[12px] font-bold text-foreground leading-tight mb-0.5">Your privacy is protected</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Photos are processed on-device. Nothing is stored without your consent.</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── STEP 2: HEIGHT ─── */}
          {scan.flowStep === 'height' && (
            <CaptureHeightStep
              heightCm={scan.heightCm} heightFt={scan.heightFt} heightIn={scan.heightIn}
              useCm={scan.useCm} heightValid={scan.heightValid} heightTouched={scan.heightTouched}
              refObject={scan.refObject} genderLoaded={genderLoaded} genderSet={genderSet}
              onHeightCmChange={scan.setHeightCm} onHeightFtChange={scan.setHeightFt} onHeightInChange={scan.setHeightIn}
              onUseCmChange={scan.setUseCm} onRefObjectChange={scan.setRefObject} onGenderSelect={handleGenderSelect}
            />
          )}

          {/* ─── STEP 3 & 4: FRONT / SIDE CAPTURE ─── */}
          {(scan.flowStep === 'front' || scan.flowStep === 'side') && !scan.reviewing && (
            <motion.div key={scan.flowStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-sm flex flex-col items-center">
              <h2 className="text-lg font-bold text-foreground mb-0.5">{scan.config.title}</h2>
              <p className="text-[12px] text-muted-foreground text-center mb-3">{scan.config.instruction}</p>
              <CaptureViewfinder captureStep={scan.captureStep} photo={scan.photos[scan.captureStep]} />
              <p className="text-[11px] text-muted-foreground text-center bg-card border border-border px-3 py-1.5 rounded-xl mb-2 flex items-center justify-center gap-1.5">
                <span className="h-5 w-5 badge-gold-3d rounded-md flex items-center justify-center text-[10px] shrink-0">💡</span>
                {scan.config.tip}
              </p>
              <button
                onClick={async () => {
                  const key: keyof PhotoSet = scan.flowStep === 'side' ? 'side' : 'front';
                  if (isNativePlatform()) {
                    try {
                      const result = await takeNativePhoto('gallery');
                      await scan.handleCapturedPhoto(result.dataUrl, key);
                    } catch (err: any) {
                      if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) return;
                      console.error('Gallery pick error:', err);
                    }
                  } else {
                    scan.galleryInputRef.current?.click();
                  }
                }}
                className="text-[11px] text-primary font-medium flex items-center gap-1 min-h-[44px]"
              >
                <Upload className="h-3 w-3" /> Use existing photo
              </button>
            </motion.div>
          )}

          {/* ─── PHOTO REVIEW ─── */}
          {(scan.flowStep === 'front' || scan.flowStep === 'side') && scan.reviewing && scan.photos[scan.captureStep] && (
            <motion.div key={`review-${scan.flowStep}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm flex flex-col items-center">
              <h2 className="text-base font-bold text-foreground mb-1">Review: {scan.config.title}</h2>
              <p className="text-[11px] text-muted-foreground mb-2">Full body visible and well-lit?</p>
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border border-border mb-3">
                <img src={scan.photos[scan.captureStep]!} alt={scan.config.title} className="w-full h-full object-cover img-normalize" />
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
          {scan.flowStep === 'review' && (
            <CaptureReviewStep
              photos={scan.photos}
              checklist={checklist}
              heightCm={scan.getHeightCm()}
              refObject={scan.refObject}
              onRetake={(key) => { scan.setPhotos(p => ({ ...p, [key]: null })); scan.setFlowStep(key as any); }}
              onEditHeight={() => scan.setFlowStep('height')}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t border-border/40 px-4 pb-4 pt-3 space-y-2 w-full">
        {scan.flowStep === 'intro' && (
          scanGated ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 w-full">
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-primary mb-1">Scan limit reached</p>
                <p className="text-[12px] text-muted-foreground">Free accounts get 1 body scan. Upgrade to Premium or enter a Founder Access Code for unlimited scans.</p>
              </div>
              <Button className="w-full h-12 rounded-xl text-sm font-semibold" onClick={() => navigate('/premium')}>Upgrade to Premium</Button>
            </motion.div>
          ) : (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button className="w-full h-12 rounded-xl text-sm font-semibold uppercase tracking-wider" onClick={() => { if (!user) { setAuthSheetOpen(true); } else { scan.setFlowStep('height'); } }}>
                <FeatureIcon name="scan" size={18} className="mr-2" /> Start Scan
              </Button>
            </motion.div>
          )
        )}

        {scan.flowStep === 'height' && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button className="w-full h-12 rounded-xl text-sm font-semibold" disabled={!scan.heightValid} onClick={() => scan.setFlowStep('front')}>
              Continue to Photos <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {(scan.flowStep === 'front' || scan.flowStep === 'side') && !scan.reviewing && (
          <>
            {scan.photos[scan.captureStep] ? (
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm" onClick={scan.handleRetake}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
                </Button>
                <Button className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm" onClick={() => scan.setReviewing(true)}>Review</Button>
              </div>
            ) : (
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button className="w-full h-12 rounded-xl text-sm font-semibold" onClick={scan.handleCapture}>
                  <FeatureIcon name="scan" size={18} className="mr-2" /> Take {scan.config.title} Photo
                </Button>
              </motion.div>
            )}
          </>
        )}

        {(scan.flowStep === 'front' || scan.flowStep === 'side') && scan.reviewing && (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm" onClick={scan.handleRetake}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Retake
            </Button>
            <Button className="flex-1 h-12 rounded-xl active:scale-[0.97] transition-transform text-sm" onClick={scan.handlePhotoAccept}>
              <Check className="mr-1.5 h-4 w-4" />
              {scan.flowStep === 'front' ? 'Next: Side' : 'Review All'}
            </Button>
          </div>
        )}

        {scan.flowStep === 'review' && (
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button className="w-full h-12 rounded-xl text-sm font-semibold" disabled={!allDone} onClick={handleAnalyze}>Analyze Scan</Button>
          </motion.div>
        )}

        <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <FeatureIcon name="shield" size={14} /> Private by default · delete anytime
        </p>
      </div>

      {/* Web Camera Sheet */}
      <Sheet open={scan.webCameraOpen} onOpenChange={(open) => { scan.setWebCameraOpen(open); if (!open) scan.stopWebCamera(); }}>
        <SheetContent side="bottom" className="h-[100svh] rounded-none p-0 border-none">
          <SheetHeader className="sr-only">
            <SheetTitle>Take {scan.config.title} Photo</SheetTitle>
            <SheetDescription>Use your live camera preview to capture this scan photo.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Take {scan.config.title} Photo</p>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => scan.setWebCameraOpen(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative flex-1 overflow-hidden bg-muted">
              <video ref={scan.videoRef} autoPlay muted playsInline className={`h-full w-full object-cover transition-opacity duration-200 ${scan.videoReady ? 'opacity-100' : 'opacity-0'}`} />
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0">
                  <div className="absolute left-1/2 top-[8%] bottom-[8%] w-px -translate-x-1/2 bg-primary/20" />
                  <div className="absolute left-[15%] right-[15%] top-[25%] h-px bg-primary/20" />
                  <div className="absolute left-[15%] right-[15%] top-[75%] h-px bg-primary/20" />
                </div>
                <div className="absolute inset-y-[8%] inset-x-[18%]">
                  <div
                    className={`h-full w-full rounded-full transition-opacity duration-200 ${scan.videoReady ? 'opacity-60' : 'opacity-90'}`}
                    style={{
                      backgroundImage: 'linear-gradient(180deg, hsl(var(--primary) / 0.55) 0%, hsl(var(--primary) / 0.25) 55%, hsl(var(--primary) / 0.45) 100%)',
                      WebkitMaskImage: `url(${cameraMaskUrl})`, maskImage: `url(${cameraMaskUrl})`,
                      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center', maskPosition: 'center',
                      WebkitMaskSize: 'contain', maskSize: 'contain',
                    } as React.CSSProperties}
                  />
                </div>
              </div>
              {!scan.videoReady && (
                <div className="absolute inset-x-4 top-4 rounded-xl border border-border bg-background/90 px-3 py-2 text-center backdrop-blur-sm">
                  <p className="text-[11px] font-medium text-foreground">{scan.cameraError ?? 'Starting camera preview...'}</p>
                </div>
              )}
            </div>
            <div className="space-y-2 border-t border-border px-4 py-4">
              <Button className="h-12 w-full rounded-xl text-sm font-semibold" onClick={scan.startTimedWebCapture} disabled={scan.captureCountdown !== null}>
                <FeatureIcon name="scan" size={18} className="mr-2" />
                {scan.captureCountdown !== null ? `Capturing in ${scan.captureCountdown}s` : scan.videoReady ? 'Capture Photo (3s Timer)' : 'Open Camera App'}
              </Button>
              {!scan.videoReady && (
                <Button variant="outline" className="h-11 w-full rounded-xl text-sm font-semibold" onClick={scan.openWebCamera} disabled={scan.captureCountdown !== null}>Retry Live Preview</Button>
              )}
              <Button variant="secondary" className="h-11 w-full rounded-xl text-sm font-semibold" onClick={() => scan.galleryInputRef.current?.click()} disabled={scan.captureCountdown !== null}>
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
            <SheetDescription className="text-[12px] text-muted-foreground">Your scan results will be saved to your profile and used for size recommendations.</SheetDescription>
          </SheetHeader>
          <div className="space-y-2">
            <Button className="w-full h-11 rounded-xl text-sm font-semibold" onClick={() => { setAuthSheetOpen(false); navigate('/auth?returnTo=/capture'); }}>
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Button>
            <Button variant="outline" className="w-full h-11 rounded-xl text-sm font-semibold" onClick={() => { setAuthSheetOpen(false); setGuestMode(); scan.setFlowStep('height'); toast({ title: "Scan results won't be saved without an account", variant: 'destructive' }); }}>
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
