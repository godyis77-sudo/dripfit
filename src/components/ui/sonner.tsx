import { forwardRef } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = forwardRef<HTMLDivElement, ToasterProps>((props, ref) => {
  const { theme = "system" } = useTheme();

  return (
    <div ref={ref}>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        position="bottom-center"
        duration={3000}
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-[#1C1C1C] group-[.toaster]:text-foreground group-[.toaster]:border-[#2A2A2A] group-[.toaster]:shadow-lg group-[.toaster]:text-[14px]",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
        {...props}
      />
    </div>
  );
});

Toaster.displayName = "Toaster";

export { Toaster, toast };
