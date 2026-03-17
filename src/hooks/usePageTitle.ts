import { useEffect } from 'react';

const BASE_TITLE = 'DRIPFIT ✔';

export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} — ${BASE_TITLE}` : `${BASE_TITLE} — Your Tailored Size & Style. Verified Culture, Certified Drip.`;
    return () => {
      document.title = `${BASE_TITLE} — Your Tailored Size & Style. Verified Culture, Certified Drip.`;
    };
  }, [page]);
}
