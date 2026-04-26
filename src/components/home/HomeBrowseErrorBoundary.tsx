import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for the home page browse section.
 * Prevents one failing CategoryProductGrid from blanking the whole page.
 */
class HomeBrowseErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[HomeBrowseErrorBoundary]', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mb-6 rounded-2xl bg-white/[0.02] border border-border/[0.06] px-5 py-6 text-center">
          <p className="font-sans text-[13px] font-semibold text-foreground/80 mb-1">
            Couldn't load the catalog
          </p>
          <p className="font-sans text-[12px] text-muted-foreground mb-3">
            Tap retry to fetch the latest pieces.
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[12px] font-bold tracking-wide active:scale-95 transition-transform"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default HomeBrowseErrorBoundary;
