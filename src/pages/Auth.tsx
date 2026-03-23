import { useEffect } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import AuthForm from '@/components/auth/AuthForm';

const Auth = () => {
  usePageMeta({ title: 'Sign In', path: '/auth' });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const rawReturn = searchParams.get('returnTo') || '/';
  const returnTo = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : '/';

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate(returnTo, { replace: true });
    }
  }, [user, authLoading, navigate, returnTo]);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/home');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 h-10 w-10 rounded-full glass-card flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4 text-foreground" />
      </button>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 h-[250px] w-[250px] rounded-full bg-primary/6 blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[320px] flex flex-col items-center">
        <AuthForm onComplete={() => navigate(returnTo, { replace: true })} />
      </motion.div>
    </div>
  );
};

export default Auth;
