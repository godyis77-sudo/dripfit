import { useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import AuthForm from '@/components/auth/AuthForm';

const Auth = () => {
  usePageTitle('Sign In');
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 h-[250px] w-[250px] rounded-full bg-primary/6 blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-[320px] flex flex-col items-center">
        <AuthForm showBackButton onComplete={() => navigate(returnTo, { replace: true })} />
      </motion.div>
    </div>
  );
};

export default Auth;
