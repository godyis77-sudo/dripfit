import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <div className="h-16 w-16 rounded-2xl gradient-drip flex items-center justify-center mx-auto mb-5 glow-primary">
          <Crown className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="text-5xl font-bold text-primary mb-2">404</h1>
        <p className="text-[15px] font-semibold text-foreground mb-1">Page not found</p>
        <p className="text-[12px] text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="space-y-2">
          <Button
            className="w-full h-11 rounded-xl btn-luxury text-primary-foreground text-sm font-bold"
            onClick={() => navigate('/')}
          >
            <Home className="mr-2 h-4 w-4" /> Back to Home
          </Button>
          <Button
            variant="ghost"
            className="w-full text-xs text-muted-foreground"
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
