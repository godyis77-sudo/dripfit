import type { MutableRefObject, Ref, RefObject } from "react";

type ScrollContainer = HTMLElement | Window;

function findScrollableAncestor(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;

  while (parent && parent !== document.documentElement) {
    const style = getComputedStyle(parent);
    const canScrollY = /(auto|scroll)/.test(style.overflowY);
    const hasScrollableContent = parent.scrollHeight > parent.clientHeight + 1;

    if (canScrollY && hasScrollableContent) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

function getContainerBounds(container: ScrollContainer, buffer: number) {
  if (container === window) {
    return {
      top: buffer,
      bottom: window.innerHeight - buffer,
      scrollBy: (delta: number, behavior: ScrollBehavior) =>
        window.scrollBy({ top: delta, behavior }),
    };
  }

  const rect = container.getBoundingClientRect();
  return {
    top: rect.top + buffer,
    bottom: rect.bottom - buffer,
    scrollBy: (delta: number, behavior: ScrollBehavior) =>
      container.scrollBy({ top: delta, behavior }),
  };
}

/**
 * Shared auto-scroll utility for expandable UI elements.
 *
 * Ensures the full expanded block is visible when possible:
 * - If the block fits in the visible area, it scrolls until the whole block is visible.
 * - If the block is taller than the visible area, it aligns the top of the block.
 *
 * Works with page scroll and nested scroll containers (fixed overlays/sheets).
 */
export function scrollIntoViewIfNeeded(
  el: HTMLElement,
  {
    buffer = 16,
    delay = 0,
    behavior = "smooth",
  }: { buffer?: number; delay?: number; behavior?: ScrollBehavior } = {},
) {
  const run = () => {
    const container = findScrollableAncestor(el) ?? window;
    const bounds = getContainerBounds(container, buffer);
    const rect = el.getBoundingClientRect();

    const visibleHeight = Math.max(0, bounds.bottom - bounds.top);
    let delta = 0;

    // If content can't fully fit, prioritize showing its start/top.
    if (rect.height > visibleHeight) {
      if (rect.top !== bounds.top) {
        delta = rect.top - bounds.top;
      }
    } else {
      if (rect.top < bounds.top) {
        delta = rect.top - bounds.top;
      } else if (rect.bottom > bounds.bottom) {
        delta = rect.bottom - bounds.bottom;
      }
    }

    if (Math.abs(delta) > 1) {
      bounds.scrollBy(delta, behavior);
    }
  };

  if (delay > 0) {
    window.setTimeout(run, delay);
  } else {
    requestAnimationFrame(run);
  }
}

/**
 * Trigger auto-scroll after an animated expand completes.
 */
export function scrollAfterExpand(
  ref: RefObject<HTMLElement | null>,
  animationMs = 250,
) {
  if (ref.current) {
    scrollIntoViewIfNeeded(ref.current, { delay: animationMs });
  }
}

/**
 * Creates a ref callback that auto-scrolls mounted portal content into view.
 */
export function createAutoScrollRef<T extends HTMLElement>(
  ref: Ref<T> | undefined,
  delayMs = 50,
) {
  return (node: T | null) => {
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as MutableRefObject<T | null>).current = node;
    }

    if (node) {
      scrollIntoViewIfNeeded(node, { delay: delayMs });
    }
  };
}
