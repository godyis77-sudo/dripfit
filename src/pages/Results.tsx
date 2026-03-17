import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SaveBanner from '@/components/ui/save-banner';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BodyScanResult, FitPreference, MeasurementRange } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { isGuestMode } from '@/lib/session';

import BottomTabBar from '@/components/BottomTabBar';
import FitPreferenceToggle from '@/components/results/FitPreferenceToggle';
import AlternativeSizes from '@/components/results/AlternativeSizes';
import MeasurementGrid from '@/components/results/MeasurementGrid';

import BodyDiagram from '@/components/results/BodyDiagram';
import LowConfidenceRescue from '@/components/results/LowConfidenceRescue';
import ResultActions from '@/components/results/ResultActions';
import TrustPanel from '@/components/results/TrustPanel';
import ShopThisSize from '@/components/monetization/ShopThisSize';
import UpgradePrompt from '@/components/monetization/UpgradePrompt';
import FitFeedbackSheet from '@/components/monetization/FitFeedbackSheet';
import PostScanGuide from '@/components/results/PostScanGuide';
import ProfilePhotoPrompt from '@/components/results/ProfilePhotoPrompt';
import ShareResultsButton from '@/components/results/ShareResultsButton';
import SocialExportCard from '@/components/results/SocialExportCard';
import { SizeMatchCard, SizeMatchCardSkeleton } from '@/components/results/SizeMatchCard';
import SizeDiagnostic from '@/components/results/SizeDiagnostic';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
const SIZE_LADDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

function shiftSize(size: string, delta: number): string {
  const idx = SIZE_LADDER.indexOf(size);
  if (idx === -1) return size;
  return SIZE_LADDER[Math.max(0, Math.min(SIZE_LADDER.length - 1, idx + delta))];
}

const Results = () => {
  const location = useLocation();
  usePageTitle('Your Fit Results');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const socialExportRef = useRef<HTMLDivElement>(null);
  const state = location.state as { result: BodyScanResult; retailer?: string; category?: string } | undefined;
  // DB fallback query for authenticated users when no location.state or sessionStorage
  const dbScanQuery = useQuery({
    queryKey: ['latest-scan-result', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!data) return null;
      return {
        result: {
          id: data.id,
          date: data.created_at,
          heightCm: Number(data.height_cm),
          chest: { min: Number(data.chest_min), max: Number(data.chest_max) },
          waist: { min: Number(data.waist_min), max: Number(data.waist_max) },
          hips: { min: Number(data.hip_min), max: Number(data.hip_max) },
          inseam: { min: Number(data.inseam_min), max: Number(data.inseam_max) },
          shoulder: { min: Number(data.shoulder_min), max: Number(data.shoulder_max) },
          ...(data.bust_min && data.bust_max ? { bust: { min: Number(data.bust_min), max: Number(data.bust_max) } } : {}),
          ...(data.sleeve_min && data.sleeve_max ? { sleeve: { min: Number(data.sleeve_min), max: Number(data.sleeve_max) } } : {}),
          confidence: data.confidence || 'medium',
          recommendedSize: data.recommended_size || 'M',
          fitPreference: 'regular' as FitPreference,
        } as BodyScanResult,
        retailer: undefined,
        category: undefined,
      };
    },
    enabled: !!user?.id && !state?.result,
    staleTime: 5 * 60 * 1000,
  });

  // Persist scan result in sessionStorage so the page survives refresh
  const result = useMemo(() => {
    if (state?.result) {
      try { sessionStorage.setItem('dripcheck_last_result', JSON.stringify(state)); } catch {}
      return state.result;
    }
    // Fallback: restore from sessionStorage if location.state is missing (e.g. page refresh)
    try {
      const cached = sessionStorage.getItem('dripcheck_last_result');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.result as BodyScanResult;
      }
    } catch {}
    // Final fallback: load from DB
    return dbScanQuery.data?.result ?? undefined;
  }, [state, dbScanQuery.data]);

  // Also restore retailer/category from sessionStorage
  const cachedState = useMemo(() => {
    if (state) return state;
    try {
      const cached = sessionStorage.getItem('dripcheck_last_result');
      if (cached) return JSON.parse(cached) as typeof state;
    } catch {}
    return dbScanQuery.data ?? undefined;
  }, [state, dbScanQuery.data]);
  const [fitPref, setFitPref] = useState<FitPreference>(result?.fitPreference || 'regular');
  const [saved, setSaved] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const [confidence, setConfidence] = useState(result?.confidence || 'medium');
  const [showFeedback, setShowFeedback] = useState(false);
  const [adjustedMeasurements, setAdjustedMeasurements] = useState<Record<string, MeasurementRange>>({});
  const [showGuide, setShowGuide] = useState(true);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(() => {
    try { return !localStorage.getItem('profile_photo_prompted'); } catch { return false; }
  });
  const [guestNudgeDismissed, setGuestNudgeDismissed] = useState(() => {
    try { return sessionStorage.getItem('guest_nudge_dismissed') === 'true'; } catch { return false; }
  });
  const queryClient = useQueryClient();

  const brandSlug = cachedState?.retailer?.toLowerCase().replace(/\s+/g, '-') || '';
  const categoryKey = cachedState?.category?.toLowerCase() || 'tops';
  const fitQueryValue = fitPref === 'fitted' ? 'slim' : fitPref;

  const sizeRecQuery = useQuery({
    queryKey: ['size-recommendation', user?.id, brandSlug, categoryKey, fitQueryValue],
    queryFn: async () => {
      const { data: resp, error } = await supabase.functions.invoke('get-size-recommendation', {
        body: { user_id: user!.id, brand_slug: brandSlug, category: categoryKey, fit_preference: fitQueryValue },
      });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;
      return payload as {
        recommended_size: string;
        confidence: number;
        fit_status: 'true_to_size' | 'good_fit' | 'between_sizes' | 'out_of_range';
        fit_notes: string;
        second_option: string | null;
        brand_slug: string;
        category: string;
        measurement_breakdown?: { key: string; user_value: number; chart_min: number; chart_max: number; score: number; status: string }[];
      };
    },
    enabled: !!user?.id && !!brandSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const sizeRec = sizeRecQuery.data ?? null;
  const sizeRecLoading = sizeRecQuery.isLoading;
  const sizeRecError = sizeRecQuery.error ? (sizeRecQuery.error as Error).message : null;

  // Save pending guest scan when user signs up
  useEffect(() => {
    if (!user) return;
    const pending = sessionStorage.getItem('dripcheck_pending_scan');
    if (!pending) return;
    try {
      const scanPayload = JSON.parse(pending);
      supabase.from('body_scans').insert({
        user_id: user.id,
        session_id: null,
        ...scanPayload,
      }).then(({ error: dbError }) => {
        if (dbError) console.error('Failed to save pending scan:', dbError);
        else sessionStorage.removeItem('dripcheck_pending_scan');
      });
    } catch {}
  }, [user]);

  useEffect(() => {
    if (result) {
      trackEvent('results_viewed');
    }
  }, [result]);

  // When server recommendation exists, use it directly; otherwise use scoring engine
  const adjustedSize = useMemo(() => {
    if (sizeRec?.recommended_size) return sizeRec.recommended_size;
    if (!result) return '';
    const base = result.recommendedSize;
    // Fallback: use fit-aware ladder shift when no server data
    if (fitPref === 'fitted' || fitPref === 'slim') return shiftSize(base, -1);
    if (fitPref === 'relaxed') return shiftSize(base, 1);
    return base;
  }, [fitPref, result, sizeRec]);

  const fitWhyLine = useMemo(() => {
    if (sizeRec?.fit_notes) return sizeRec.fit_notes;
    const base = result?.whyLine || 'Based on your scan + retailer chart';
    const fitNotes: Record<string, string> = {
      fitted: 'Size down for a closer, tailored silhouette.',
      slim: 'Size down for a closer, tailored silhouette.',
      regular: 'True-to-size for balanced comfort and shape.',
      relaxed: 'Size up for extra ease and a looser drape.',
    };
    return `${base} · ${fitNotes[fitPref] || fitNotes.regular}`;
  }, [fitPref, result, sizeRec]);

  const alternatives = useMemo(() => ({ sizeDown: shiftSize(adjustedSize, -1), sizeUp: shiftSize(adjustedSize, 1) }), [adjustedSize]);

  const measurements: Record<string, MeasurementRange> = useMemo(() => {
    if (!result) return {};
    const base: Record<string, MeasurementRange> = {
      chest: result.chest, waist: result.waist, hips: result.hips, inseam: result.inseam, shoulder: result.shoulder,
      ...(result.bust ? { bust: result.bust } : {}),
      ...(result.sleeve ? { sleeve: result.sleeve } : {}),
    };
    return { ...base, ...adjustedMeasurements };
  }, [result, adjustedMeasurements]);

  const handleMeasurementAdjust = useCallback((key: string, newRange: MeasurementRange) => {
    setAdjustedMeasurements(prev => ({ ...prev, [key]: newRange }));
    trackEvent('measurement_adjusted', { key });
  }, []);

  if (!result) {
    return (
      <div className="min-h-screen bg-background px-4 py-4 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">No fit profile yet</h2>
          <p className="text-sm text-muted-foreground mb-5">Complete a quick body scan to get your personalized size recommendations.</p>
          <Button className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold" onClick={() => navigate('/capture')}>
            Start Scan
          </Button>
          <Button variant="ghost" className="w-full mt-2 text-xs text-muted-foreground" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    const history = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    history.unshift(result);
    localStorage.setItem('dripcheck_scans', JSON.stringify(history));
    setSaved(true);
    setShowSaveBanner(true);
    trackEvent('results_saved');
    trackEvent('save_item', { type: 'scan' });
  };

  const handleDelete = () => { toast({ title: 'Deleted', description: 'Scan data removed.' }); navigate('/'); };

  const handleCalibrate = (data: { type: 'waist'; value: number } | { type: 'brand'; brand: string; size: string }) => {
    setConfidence('medium');
    toast({ title: 'Confidence improved', description: 'Your size recommendation is now more accurate.' });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-safe-tab">
      <SaveBanner
        visible={showSaveBanner}
        onDismiss={() => setShowSaveBanner(false)}
        navigateTo="/profile"
        label="Saved successfully"
        subtext="View in Profile > Body"
      />
      <div>
        <div className="flex items-center mb-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Size Guide Tool — top of page */}
        <button
          onClick={() => navigate('/size-guide')}
          className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 mb-3 active:scale-[0.98] transition-transform"
        >
          <div className="h-9 w-9 rounded-lg badge-gold-3d flex items-center justify-center shrink-0">
            <span className="text-sm">📏</span>
          </div>
          <div className="text-left">
            <p className="text-[12px] font-bold text-foreground">Size Guide Tool</p>
            <p className="text-[10px] text-muted-foreground">Check your size for any brand</p>
          </div>
        </button>

        {/* Post-scan guided flow */}
        <AnimatePresence>
          {showGuide && (
            <PostScanGuide
              result={result}
              recommendedSize={adjustedSize}
              onDismiss={() => {
                setShowGuide(false);
                trackEvent('postscan_dismissed');
              }}
            />
          )}
        </AnimatePresence>

        {/* Live SizeMatchCard from edge function */}
        {user && brandSlug ? (
          <div className="mb-3">
            {sizeRecLoading ? (
              <SizeMatchCardSkeleton />
            ) : (
              <SizeMatchCard
                brandName={cachedState?.retailer || brandSlug}
                category={categoryKey}
                recommendedSize={sizeRec?.recommended_size || adjustedSize}
                confidence={sizeRec?.confidence ?? 0}
                fitStatus={sizeRec?.fit_status || 'good_fit'}
                fitNotes={sizeRec?.fit_notes || ''}
                secondOption={sizeRec?.second_option}
                fitPreference={fitPref === 'fitted' ? 'slim' : (fitPref as 'slim' | 'regular' | 'relaxed')}
                sourceUrl={null}
                updatedAt={new Date().toISOString()}
                loading={false}
                onFitChange={(fit) => {
                  setFitPref(fit === 'slim' ? 'fitted' : fit as FitPreference);
                  queryClient.invalidateQueries({ queryKey: ['size-recommendation'] });
                  trackEvent('fit_preference_changed', { fit });
                }}
              />
            )}
            {sizeRecError && (
              <p className="mt-1 text-xs text-destructive">{sizeRecError}</p>
            )}
          </div>
        ) : null}

        {/* Guest sign-up nudge */}
        {isGuestMode() && !user && !guestNudgeDismissed && (
          <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-4 relative">
            <button
              onClick={() => {
                setGuestNudgeDismissed(true);
                try { sessionStorage.setItem('guest_nudge_dismissed', 'true'); } catch {}
              }}
              className="absolute top-2 right-2 text-muted-foreground text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
            <p className="text-sm font-medium text-foreground mb-1">Your scan isn't saved yet</p>
            <p className="text-[12px] text-muted-foreground mb-3">Create a free account to keep your measurements, get size recommendations, and access them on any device.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="btn-luxury"
                onClick={() => navigate('/auth?returnTo=/results')}
              >
                Sign up to save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setGuestNudgeDismissed(true);
                  try { sessionStorage.setItem('guest_nudge_dismissed', 'true'); } catch {}
                  navigate('/');
                }}
              >
                Explore App
              </Button>
            </div>
          </div>
        )}

        {/* Post-scan profile photo prompt */}
        <AnimatePresence>
          {showPhotoPrompt && user && (
            <ProfilePhotoPrompt
              userId={user.id}
              onDismiss={() => setShowPhotoPrompt(false)}
              onUploaded={() => setShowPhotoPrompt(false)}
            />
          )}
        </AnimatePresence>

        <FitPreferenceToggle value={fitPref} onChange={setFitPref} />
        <AlternativeSizes sizeDown={alternatives.sizeDown} sizeUp={alternatives.sizeUp} best={adjustedSize} fitPreference={fitPref} />

        {/* Measurement diagnostic breakdown */}
        {sizeRec?.measurement_breakdown && sizeRec.measurement_breakdown.length > 0 && (
          <SizeDiagnostic
            breakdown={sizeRec.measurement_breakdown}
            recommendedSize={sizeRec.recommended_size}
            brandName={cachedState?.retailer}
            confidence={sizeRec.confidence}
          />
        )}

        <ShopThisSize
          recommendedSize={adjustedSize}
          confidence={confidence}
          retailer={cachedState?.retailer}
          category={cachedState?.category}
        />

        {/* Return Risk warning */}
        {(confidence === 'low' || confidence === 'medium') && (
          <div className={`rounded-xl border px-3 py-2.5 mb-3 ${confidence === 'low' ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/5 border-primary/20'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className={`h-4 w-4 ${confidence === 'low' ? 'text-destructive' : 'text-primary'}`} />
              <p className="text-[12px] font-bold text-foreground">
                {confidence === 'low' ? '⚠️ Higher Return Risk' : '📏 Between Sizes'}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {confidence === 'low'
                ? `We recommend trying ${shiftSize(adjustedSize, 1)} as a safer alternative. Consider ordering both ${adjustedSize} and ${shiftSize(adjustedSize, 1)} if returns are free.`
                : `You're close to the boundary. ${adjustedSize} is our best pick, but ${shiftSize(adjustedSize, 1)} could also work for a looser fit.`}
            </p>
          </div>
        )}

        <TrustPanel
          confidence={confidence}
          recommendedSize={adjustedSize}
          measurements={measurements}
          onAdjust={handleMeasurementAdjust}
          retailer={cachedState?.retailer}
        />

        {confidence === 'low' && <LowConfidenceRescue onCalibrate={handleCalibrate} />}

        <ResultActions
          saved={saved}
          scanDate={result.date}
          onSave={handleSave}
          onTryOn={() => { trackEvent('results_tryon_click'); navigate('/tryon', { state: { bodyProfile: result } }); }}
          onNewScan={() => navigate('/capture')}
          onDelete={handleDelete}
          recommendedSize={adjustedSize}
          measurements={measurements}
          heightCm={result.heightCm}
        />


        {/* Body Map section */}
        <div className="mt-3 space-y-3">
          <BodyDiagram measurements={measurements} heightCm={result.heightCm} />
          <MeasurementGrid measurements={measurements} heightCm={result.heightCm} />
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Results;
