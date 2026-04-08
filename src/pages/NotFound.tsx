import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/ui/BrandLogo";
import BottomTabBar from "@/components/BottomTabBar";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 pb-safe-tab">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-[320px]"
      >
        <h1 className="headline-editorial text-6xl text-white/10 mb-4">404</h1>
        <p className="headline-editorial text-xl text-white/60 mb-1">Page not found</p>
        <p className="text-[12px] text-white/30 mb-6 font-sans">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-2">
          <Button
            className="w-full h-11 rounded-xl btn-glass text-white text-sm font-semibold"
            onClick={() => navigate('/home')}
          >
            <Home className="mr-2 h-4 w-4" /> Back to Home
          </Button>
          <Button
            variant="ghost"
            className="w-full text-xs text-white/30"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Go Back
          </Button>
        </div>
      </motion.div>
      <BottomTabBar />
    </div>
  );
};

export default NotFound;
