import { useEffect, lazy, Suspense } from "react";
import { App as CapApp } from "@capacitor/app";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType, useParams } from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageTransition } from "@/components/layout/PageTransition";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import AffiliateProvider from "./components/AffiliateProvider";
import Capture from "./pages/Capture";
import GuestTimedNudge from "./components/guest/GuestTimedNudge";

/** Clears onboarding flags and redirects to /home so the overlay re-appears */
function OnboardingReset() {
  localStorage.removeItem('onboarding_complete');
  sessionStorage.removeItem('onboarding_intro_started');
  return <Navigate to="/home" replace />;
}

// ── Lazy-loaded pages (code-split per route) ──────────────────────────
const Splash = lazy(() => import("./pages/Splash"));
const Welcome = lazy(() => import("./pages/Welcome"));

const Analyze = lazy(() => import("./pages/Analyze"));
const Results = lazy(() => import("./pages/Results"));
const ScanSuccess = lazy(() => import("./pages/ScanSuccess"));
const History = lazy(() => import("./pages/History"));
const Auth = lazy(() => import("./pages/Auth"));
const TryOn = lazy(() => import("./pages/TryOn"));
const TryOnDetail = lazy(() => import("./pages/TryOnDetail"));
const Community = lazy(() => import("./pages/Community"));
const StyleCheckDetail = lazy(() => import("./pages/StyleCheckDetail"));
const ResultsDetail = lazy(() => import("./pages/ResultsDetail"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileBody = lazy(() => import("./pages/ProfileBody"));
const Premium = lazy(() => import("./pages/Premium"));
const SavedItems = lazy(() => import("./pages/SavedItems"));
const Cart = lazy(() => import("./pages/Cart"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Browse = lazy(() => import("./pages/Browse"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const AdminRetailers = lazy(() => import("./pages/AdminRetailers"));
const AdminCommissions = lazy(() => import("./pages/AdminCommissions"));
const CreatorDashboard = lazy(() => import("./pages/CreatorDashboard"));
const Waitlist = lazy(() => import("./pages/Waitlist"));
const Partnership = lazy(() => import("./pages/Partnership"));
const FoundingMembers = lazy(() => import("./pages/FoundingMembers"));
const MediaKit = lazy(() => import("./pages/MediaKit"));
const LinkHub = lazy(() => import("./pages/LinkHub"));
const Backgrounds = lazy(() => import("./pages/Backgrounds"));
const SizeComparison = lazy(() => import("./pages/SizeComparison"));
const OutfitBuilder = lazy(() => import("./pages/OutfitBuilder"));
const OutfitsWeekly = lazy(() => import("./pages/OutfitsWeekly"));
const StyleAssistant = lazy(() => import("./pages/StyleAssistant"));
const Closet = lazy(() => import("./pages/Closet"));

// ── Suspense fallback (minimal, matches app background) ───────────────
const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Android hardware back button support
  useEffect(() => {
    const listener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
    return () => { listener.then(l => l.remove()); };
  }, []);

  return null;
};

/** Redirects /community/:postId → /style-check/:postId preserving the param */
const CommunityPostRedirect = () => {
  const { postId } = useParams();
  return <Navigate to={`/style-check/${postId}`} replace />;
};

/** Extracts location for AnimatePresence keying */
const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <ErrorBoundary>
    <Suspense fallback={<RouteFallback />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Splash />} />
          <Route path="/home" element={<PageTransition><Welcome /></PageTransition>} />
          <Route path="/onboarding" element={<OnboardingReset />} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/capture" element={<PageTransition><Capture /></PageTransition>} />
          <Route path="/analyze" element={<PageTransition><Analyze /></PageTransition>} />
          <Route path="/scan-success" element={<PageTransition><ScanSuccess /></PageTransition>} />
          <Route path="/results" element={<PageTransition><Results /></PageTransition>} />
          <Route path="/results/:scanId" element={<PageTransition><ResultsDetail /></PageTransition>} />
          <Route path="/history" element={<Navigate to="/profile/history" replace />} />
          <Route path="/tryon" element={<PageTransition><TryOn /></PageTransition>} />
          <Route path="/tryon/:lookId" element={<PageTransition><TryOnDetail /></PageTransition>} />
          <Route path="/style-check" element={<PageTransition><Community /></PageTransition>} />
          <Route path="/style-check/:postId" element={<PageTransition><StyleCheckDetail /></PageTransition>} />
          <Route path="/community" element={<Navigate to="/style-check" replace />} />
          <Route path="/community/:postId" element={<CommunityPostRedirect />} />
          <Route path="/settings" element={<Navigate to="/profile/settings" replace />} />
          <Route path="/browse" element={<Navigate to="/browse/all" replace />} />
          <Route path="/scan" element={<Navigate to="/capture" replace />} />
          <Route path="/saved" element={<Navigate to="/profile/saved" replace />} />
          <Route path="/try-on" element={<Navigate to="/tryon" replace />} />
          <Route path="/style" element={<Navigate to="/style-check" replace />} />
          <Route path="/shop" element={<Navigate to="/browse/all" replace />} />
          <Route path="/size-guide" element={<PageTransition><SizeGuide /></PageTransition>} />
          <Route path="/sizing" element={<Navigate to="/size-guide" replace />} />
          <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
          <Route path="/profile/settings" element={<ProtectedRoute><PageTransition><ProfileSettings /></PageTransition></ProtectedRoute>} />
          <Route path="/profile/saved" element={<ProtectedRoute><PageTransition><SavedItems /></PageTransition></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><PageTransition><Cart /></PageTransition></ProtectedRoute>} />
          <Route path="/profile/history" element={<ProtectedRoute><PageTransition><History /></PageTransition></ProtectedRoute>} />
          <Route path="/profile/body" element={<ProtectedRoute><PageTransition><ProfileBody /></PageTransition></ProtectedRoute>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route path="/profile/:username" element={<PageTransition><PublicProfile /></PageTransition>} />
          <Route path="/browse/:category" element={<PageTransition><Browse /></PageTransition>} />
          <Route path="/premium" element={<PageTransition><Premium /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="/admin/retailers" element={<ProtectedRoute><PageTransition><AdminRetailers /></PageTransition></ProtectedRoute>} />
          <Route path="/admin/commissions" element={<ProtectedRoute><PageTransition><AdminCommissions /></PageTransition></ProtectedRoute>} />
          <Route path="/creator" element={<ProtectedRoute><PageTransition><CreatorDashboard /></PageTransition></ProtectedRoute>} />
          <Route path="/waitlist" element={<PageTransition><Waitlist /></PageTransition>} />
          <Route path="/partnership" element={<PageTransition><Partnership /></PageTransition>} />
          <Route path="/founding-members" element={<PageTransition><FoundingMembers /></PageTransition>} />
          <Route path="/media-kit" element={<PageTransition><MediaKit /></PageTransition>} />
          <Route path="/links" element={<PageTransition><LinkHub /></PageTransition>} />
          <Route path="/backgrounds" element={<PageTransition><Backgrounds /></PageTransition>} />
          <Route path="/my-sizes" element={<ProtectedRoute><PageTransition><SizeComparison /></PageTransition></ProtectedRoute>} />
          <Route path="/outfits" element={<ProtectedRoute><PageTransition><OutfitBuilder /></PageTransition></ProtectedRoute>} />
          <Route path="/outfits-weekly" element={<PageTransition><OutfitsWeekly /></PageTransition>} />
          <Route path="/style-assistant" element={<PageTransition><StyleAssistant /></PageTransition>} />
          <Route path="/closet" element={<PageTransition><Closet /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
    </ErrorBoundary>
  );
};

const App = () => {
  useTheme();
  return (
  <MotionConfig reducedMotion="user">
  <QueryClientProvider client={queryClient}>
    <AffiliateProvider provider="skimlinks" />
    <OfflineBanner />
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GuestTimedNudge />
          <ScrollToTop />
          <MobileShell>
            <AnimatedRoutes />
          </MobileShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </MotionConfig>
  );
};

export default App;