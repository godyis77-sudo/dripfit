import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { createAutoScrollRef } from "@/lib/autoScroll";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>((props, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={createAutoScrollRef(ref, (node) => node.dataset.state === "open")}
    {...props}
  />
));
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
