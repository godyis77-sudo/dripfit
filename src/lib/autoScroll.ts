/**
 * Shared auto-scroll utility for expandable UI elements.
 *
 * Scrolls the nearest scrollable ancestor (or window) so that
 * the given element's bottom edge is visible with breathing room.
 * Works inside fixed overlays with their own scroll containers.
 *
 * @param el      - The element to scroll into view
 * @param buffer  - Pixels of breathing room below the element (default 16)
 * @param delay   - Ms to wait before measuring (for animated content, default 0)
 */
export function scrollIntoViewIfNeeded(
  el: HTMLElement,
  { buffer = 16, delay = 0 }: { buffer?: number; delay?: number } = {},
) {
  const run = () => {
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const overflow = rect.bottom - viewportH + buffer;
    if (overflow <= 0) return;

    // Walk up to find the nearest scrollable ancestor
    let parent = el.parentElement;
    while (parent && parent !== document.documentElement) {
      const style = getComputedStyle(parent);
      if (
        /(auto|scroll)/.test(style.overflowY) &&
        parent.scrollHeight > parent.clientHeight
      ) {
        parent.scrollBy({ top: overflow, behavior: "smooth" });
        return;
      }
      parent = parent.parentElement;
    }

    window.scrollBy({ top: overflow, behavior: "smooth" });
  };

  if (delay > 0) {
    setTimeout(run, delay);
  } else {
    requestAnimationFrame(run);
  }
}

/**
 * Trigger auto-scroll after an animated expand completes.
 * Use for framer-motion or CSS animation containers.
 *
 * @param ref           - React ref to the expanding element
 * @param animationMs   - Duration of the expand animation (default 250)
 */
export function scrollAfterExpand(
  ref: React.RefObject<HTMLElement | null>,
  animationMs = 250,
) {
  if (ref.current) {
    scrollIntoViewIfNeeded(ref.current, { delay: animationMs });
  }
}

/**
 * Creates a ref callback that auto-scrolls the element into view
 * when it mounts. For Radix portal-based content (Popover, Select,
 * DropdownMenu) that only mount when open.
 *
 * @param ref       - The forwarded ref from React.forwardRef
 * @param delayMs   - Delay before measuring (default 50, enough for portal positioning)
 */
export function createAutoScrollRef<T extends HTMLElement>(
  ref: React.Ref<T> | undefined,
  delayMs = 50,
) {
  return (node: T | null) => {
    // Forward the ref
    if (typeof ref === "function") ref(node);
    else if (ref)
      (ref as React.MutableRefObject<T | null>).current = node;

    if (node) {
      scrollIntoViewIfNeeded(node, { delay: delayMs });
    }
  };
}
