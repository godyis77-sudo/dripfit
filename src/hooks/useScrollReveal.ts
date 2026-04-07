import { useCallback, useRef, useEffect } from 'react';

/**
 * Lightweight scroll-reveal hook using IntersectionObserver.
 * Returns a ref callback to attach to each card element.
 * Cards start invisible and fade+slide in when they enter the viewport.
 */
export function useScrollReveal() {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<Element>>(new Set());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-revealed');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px 50px 0px' }
    );

    // Observe any elements registered before observer was ready
    elementsRef.current.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  /** Attach this as a ref callback on each card */
  const revealRef = useCallback((index: number) => {
    return (el: HTMLElement | null) => {
      if (!el) return;
      // Set stagger delay (cap at 300ms)
      const delay = Math.min(index * 50, 300);
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add('scroll-reveal-item');
      elementsRef.current.add(el);
      observerRef.current?.observe(el);
    };
  }, []);

  return { revealRef };
}
