import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 pt-6">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-2.5 w-48 rounded" />
            </div>
          </div>
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
