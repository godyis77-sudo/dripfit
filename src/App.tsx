import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/hooks/useAuth";
import { MobileShell } from "@/components/layout/MobileShell";
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
import NotFound from "./pages/NotFound";
import PublicProfile from "./pages/PublicProfile";
import Browse from "./pages/Browse";
import ProfileSettings from "./pages/ProfileSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MobileShell>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/capture" element={<Capture />} />
                <Route path="/analyze" element={<Analyze />} />
                <Route path="/scan-success" element={<ScanSuccess />} />
                <Route path="/results" element={<Results />} />
                <Route path="/results/:scanId" element={<ResultsDetail />} />
                <Route path="/history" element={<Navigate to="/profile/history" replace />} />
                <Route path="/tryon" element={<TryOn />} />
                <Route path="/tryon/:lookId" element={<TryOnDetail />} />
                <Route path="/style-check" element={<Community />} />
                <Route path="/style-check/:postId" element={<StyleCheckDetail />} />
                {/* Backwards compat redirects */}
                <Route path="/community" element={<Navigate to="/style-check" replace />} />
                <Route path="/community/:postId" element={<Navigate to="/style-check" replace />} />
                <Route path="/saved" element={<Navigate to="/profile/saved" replace />} />
                <Route path="/size-guide" element={<SizeGuide />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/settings" element={<ProfileSettings />} />
                <Route path="/profile/saved" element={<SavedItems />} />
                <Route path="/profile/history" element={<History />} />
                <Route path="/profile/body" element={<ProfileBody />} />
                <Route path="/profile/body" element={<ProfileBody />} />
                <Route path="/profile/:username" element={<PublicProfile />} />
                <Route path="/browse/:category" element={<Browse />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </MobileShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
