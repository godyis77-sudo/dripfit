import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>((props, ref) => {
  const internalRef = React.useRef<HTMLDivElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;

      if (node && node.dataset.state === "open") {
        requestAnimationFrame(() => {
          const rect = node.getBoundingClientRect();
          const viewportH = window.innerHeight;
          const overflow = rect.bottom - viewportH + 16;
          if (overflow > 0) {
            window.scrollBy({ top: overflow, behavior: "smooth" });
          }
        });
      }
    },
    [ref],
  );

  return <CollapsiblePrimitive.CollapsibleContent ref={setRefs} {...props} />;
});
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
