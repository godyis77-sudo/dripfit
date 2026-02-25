import { useEffect } from 'react';

const BASE_TITLE = 'DRIP FIT';

export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} — ${BASE_TITLE}` : `${BASE_TITLE} — Know Your Size Before You Buy`;
    return () => {
      document.title = `${BASE_TITLE} — Know Your Size Before You Buy`;
    };
  }, [page]);
}
