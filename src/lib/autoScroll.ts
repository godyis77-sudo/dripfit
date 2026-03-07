/**
 * Scrolls the nearest scrollable ancestor (or window) so that
 * the given element's bottom edge is visible with breathing room.
 *
 * Works inside fixed overlays with their own scroll containers.
 */
export function scrollIntoViewIfNeeded(el: HTMLElement, buffer = 16) {
  const rect = el.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const overflow = rect.bottom - viewportH + buffer;
  if (overflow <= 0) return;

  // Walk up to find the nearest scrollable ancestor
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
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
}

/**
 * Creates a merged ref callback that auto-scrolls the element into view
 * when it appears. Suitable for Radix UI portal-based content (Popover,
 * Select, DropdownMenu) and expandable containers (Accordion, Collapsible).
 *
 * @param ref - The forwarded ref from React.forwardRef
 * @param condition - Optional extra condition; when false the scroll is skipped.
 *                    Useful for checking `data-state="open"`.
 */
export function createAutoScrollRef<T extends HTMLElement>(
  ref: React.Ref<T> | undefined,
  condition?: (node: T) => boolean,
) {
  let internalRef: T | null = null;

  return (node: T | null) => {
    internalRef = node;
    // Forward the ref
    if (typeof ref === "function") ref(node);
    else if (ref)
      (ref as React.MutableRefObject<T | null>).current = node;

    if (node && (condition ? condition(node) : true)) {
      requestAnimationFrame(() => {
        scrollIntoViewIfNeeded(node);
      });
    }
  };
}
