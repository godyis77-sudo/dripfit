import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Terms = () => {
  const navigate = useNavigate();
  usePageTitle('Terms of Service');

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg text-muted-foreground" aria-label="Go back">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-[15px] font-bold text-foreground">Terms of Service</h1>
        </div>

        <p className="text-xs text-muted-foreground mb-4">Last updated: March 2026</p>

        <p className="text-sm text-foreground/90 leading-relaxed">
          Full terms coming soon. By using DripFitCheck you agree to use the app in accordance with our community guidelines.
        </p>
      </div>
    </div>
  );
};

export default Terms;