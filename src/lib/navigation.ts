/**
 * Global navigation & deep-link utilities.
 * Centralizes redirect logic for consistent behavior worldwide.
 */

/** Build a URL with returnTo for post-auth redirect */
export function authRedirectUrl(returnTo: string): string {
  return `/auth?returnTo=${encodeURIComponent(returnTo)}`;
}

/** Parse returnTo from current URL search params */
export function getReturnTo(search: string, fallback = '/'): string {
  const params = new URLSearchParams(search);
  return params.get('returnTo') || fallback;
}

/** Supported deep link paths */
const DEEP_LINK_ROUTES = [
  '/capture', '/tryon', '/style-check', '/profile',
  '/results', '/browse', '/premium', '/size-guide', '/my-sizes',
] as const;

/** Validate and resolve a deep link path, returning null for invalid paths */
export function resolveDeepLink(path: string): string | null {
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  if (DEEP_LINK_ROUTES.some(r => cleaned.startsWith(r))) return cleaned;
  if (cleaned === '/' || cleaned === '') return '/';
  return null;
}

/** Build a shareable deep link URL */
export function buildShareUrl(path: string, params?: Record<string, string>): string {
  const base = window.location.origin;
  const url = new URL(path, base);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}
