import { useEffect } from 'react';

const BASE_TITLE = 'DRIPFIT ✔';
const DEFAULT_DESC = 'AI body measurements from 2 photos in 60 seconds. Virtual try-on, size guide matching, and real community feedback.';
const SITE_URL = 'https://dripfitcheck.lovable.app';

interface PageMeta {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
}

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function usePageMeta({ title, description, path, ogImage }: PageMeta = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${BASE_TITLE}` : `${BASE_TITLE} — Your Tailored Size & Style`;
    const desc = description || DEFAULT_DESC;

    document.title = fullTitle;
    setMeta('description', desc);
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('twitter:title', fullTitle, 'name');
    setMeta('twitter:description', desc, 'name');

    if (ogImage) {
      setMeta('og:image', ogImage, 'property');
      setMeta('twitter:image', ogImage, 'name');
    }

    if (path) {
      const canonical = `${SITE_URL}${path}`;
      setMeta('og:url', canonical, 'property');
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (link) link.href = canonical;
    }

    return () => {
      document.title = `${BASE_TITLE} — Your Tailored Size & Style`;
      setMeta('description', DEFAULT_DESC);
      setMeta('og:title', `${BASE_TITLE} — Your Tailored Size & Style`, 'property');
      setMeta('og:description', DEFAULT_DESC, 'property');
      setMeta('twitter:title', `${BASE_TITLE} — Your Tailored Size & Style`, 'name');
      setMeta('twitter:description', DEFAULT_DESC, 'name');
    };
  }, [title, description, path, ogImage]);
}
