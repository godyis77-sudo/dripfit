import { cn } from "@/lib/utils";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

/**
 * Desktop: centered 390px mobile shell. Mobile/tablet: full width.
 * Includes swipe navigation between tabs for native-like feel.
 */
export const MobileShell = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { onTouchStart, onTouchEnd } = useSwipeNavigation();

  return (
    <div
      className={cn(
        "min-h-[100dvh] bg-background",
        "lg:flex lg:items-start lg:justify-center lg:bg-muted/30",
        className
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={cn(
          "w-full min-h-[100dvh]",
          "lg:max-w-[390px] lg:min-h-screen lg:bg-background lg:border-x lg:border-border lg:shadow-2xl"
        )}
      >
        {children}
      </div>
    </div>
  );
};
