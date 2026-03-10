import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { SizeMatchCard, SizeMatchCardSkeleton } from '@/components/results/SizeMatchCard';
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
  const state = location.state as { result: BodyScanResult; retailer?: string; category?: string } | undefined;

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
    return undefined;
  }, [state]);

  // Also restore retailer/category from sessionStorage
  const cachedState = useMemo(() => {
    if (state) return state;
    try {
      const cached = sessionStorage.getItem('dripcheck_last_result');
      if (cached) return JSON.parse(cached) as typeof state;
    } catch {}
    return undefined;
  }, [state]);
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
      };
    },
    enabled: !!user?.id && !!brandSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const sizeRec = sizeRecQuery.data ?? null;
  const sizeRecLoading = sizeRecQuery.isLoading;
  const sizeRecError = sizeRecQuery.error ? (sizeRecQuery.error as Error).message : null;

  useEffect(() => {
    if (result) {
      trackEvent('results_viewed');
    }
  }, [result]);

  const adjustedSize = useMemo(() => {
    if (!result) return '';
    const base = result.recommendedSize;
    if (fitPref === 'fitted') return shiftSize(base, -1);
    if (fitPref === 'relaxed') return shiftSize(base, 1);
    return base;
  }, [fitPref, result]);

  const fitWhyLine = useMemo(() => {
    const base = result?.whyLine || 'Based on your scan + retailer chart';
    const fitNotes: Record<string, string> = {
      fitted: 'Size down for a closer, tailored silhouette.',
      regular: 'True-to-size for balanced comfort and shape.',
      relaxed: 'Size up for extra ease and a looser drape.',
    };
    return `${base} · ${fitNotes[fitPref]}`;
  }, [fitPref, result]);

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
        <div className="max-w-sm mx-auto text-center">
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
      <div className="max-w-sm mx-auto">
        <div className="flex items-center mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

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
                brandName={state?.retailer || brandSlug}
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
            <p className="text-sm font-medium text-foreground mb-2">Save your size. Sign up to access your results on any device.</p>
            <Button
              size="sm"
              className="btn-luxury"
              onClick={() => navigate('/auth')}
            >
              Create free account
            </Button>
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

        {/* Primary CTA above fold */}
        <ShopThisSize
          recommendedSize={adjustedSize}
          confidence={confidence}
          retailer={state?.retailer}
          category={state?.category}
        />

        {/* Return Risk warning */}
        {(confidence === 'low' || confidence === 'medium') && (
          <div className={`rounded-xl border px-3 py-2.5 mb-3 ${confidence === 'low' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-primary/5 border-primary/20'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className={`h-4 w-4 ${confidence === 'low' ? 'text-orange-500' : 'text-primary'}`} />
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
          retailer={state?.retailer}
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
        />

        {/* Share */}
        <div className="mt-3 mb-2">
          <ShareResultsButton
            measurements={measurements}
            heightCm={result.heightCm}
            recommendedSize={adjustedSize}
            fitPreference={fitPref}
          />
        </div>

        {/* Tabbed sections — secondary content below */}
        <Tabs defaultValue="body" className="mt-3">
          <TabsList className="w-full grid grid-cols-2 h-9 rounded-lg bg-muted">
            <TabsTrigger value="body" className="text-[11px] font-bold rounded-md">Body Map</TabsTrigger>
            <TabsTrigger value="more" className="text-[11px] font-bold rounded-md">More</TabsTrigger>
          </TabsList>

          <TabsContent value="body" className="mt-3 space-y-3">
            <BodyDiagram measurements={measurements} heightCm={result.heightCm} />
            <MeasurementGrid measurements={measurements} heightCm={result.heightCm} />
          </TabsContent>

          <TabsContent value="more" className="mt-3 space-y-3">
            {(saved || confidence === 'low') && (
              <UpgradePrompt
                headline={confidence === 'low' ? 'Low confidence? Get smarter sizing.' : 'Want higher confidence?'}
                description="Unlock advanced calibration, brand fit memory, and return risk alerts."
              />
            )}

            {saved && (
              <div>
                <button
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 mb-2"
                >
                  Already bought something? Report how it fit
                </button>
                {showFeedback && (
                  <FitFeedbackSheet
                    retailer={state?.retailer || 'Unknown'}
                    recommendedSize={adjustedSize}
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Results;
