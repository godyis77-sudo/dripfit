import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageTransition } from "@/components/layout/PageTransition";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Capture from "./pages/Capture";
import Analyze from "./pages/Analyze";
import Results from "./pages/Results";
import ScanSuccess from "./pages/ScanSuccess";
import History from "./pages/History";
import Auth from "./pages/Auth";
import TryOn from "./pages/TryOn";
import TryOnDetail from "./pages/TryOnDetail";
import Community from "./pages/Community";
import StyleCheckDetail from "./pages/StyleCheckDetail";
import ResultsDetail from "./pages/ResultsDetail";
import SizeGuide from "./pages/SizeGuide";
import Profile from "./pages/Profile";
import ProfileBody from "./pages/ProfileBody";
import Premium from "./pages/Premium";
import SavedItems from "./pages/SavedItems";
import Cart from "./pages/Cart";
import NotFound from "./pages/NotFound";
import PublicProfile from "./pages/PublicProfile";
import Browse from "./pages/Browse";
import ProfileSettings from "./pages/ProfileSettings";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import AdminRetailers from "./pages/AdminRetailers";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AffiliateProvider from "./components/AffiliateProvider";

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

const App = () => {
  useTheme();
  return (
  <QueryClientProvider client={queryClient}>
    <AffiliateProvider provider="skimlinks" />
    <OfflineBanner />
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <MobileShell>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<PageTransition><Welcome /></PageTransition>} />
                <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
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
                {/* Backwards compat redirects */}
                <Route path="/community" element={<Navigate to="/style-check" replace />} />
                <Route path="/community/:postId" element={<Navigate to="/style-check" replace />} />
                <Route path="/saved" element={<Navigate to="/profile/saved" replace />} />
                <Route path="/size-guide" element={<PageTransition><SizeGuide /></PageTransition>} />
                <Route path="/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
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
                <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
              </Routes>
            </AnimatePresence>
          </MobileShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>

  );
};

export default App;
