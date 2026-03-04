import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-1">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
            An unexpected error occurred. Try refreshing or going back to the home screen.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              Go Home
            </Button>
            <Button onClick={this.handleReset} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
          {this.state.error && (
            <p className="mt-6 text-[10px] text-muted-foreground/50 max-w-[320px] break-all">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
