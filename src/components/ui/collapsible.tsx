import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { scrollIntoViewIfNeeded } from "@/lib/autoScroll";

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
        // Wait for expand animation before measuring
        scrollIntoViewIfNeeded(node, { delay: 300 });
      }
    },
    [ref],
  );

  return <CollapsiblePrimitive.CollapsibleContent ref={setRefs} {...props} />;
});
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
