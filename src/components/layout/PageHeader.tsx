import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string | number;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}

const PageHeader = ({ title, subtitle, backTo = -1, onBack, actions, className = '' }: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof backTo === 'number') {
      navigate(backTo as number);
    } else {
      navigate(backTo);
    }
  };

  return (
    <div className={`flex items-center gap-2 mb-3 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="type-headline text-base truncate uppercase">{title}</h1>
        {subtitle && (
          <p className="type-body truncate" style={{ fontSize: 12 }}>{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
