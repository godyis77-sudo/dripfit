import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Decode HTML entities like &#x27; → ' in product titles from scraped data */
export function decodeHtmlEntities(str: string): string {
  if (!str || !str.includes('&')) return str;
  const doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.documentElement.textContent || str;
}

/**
 * Strip scraping/metadata artifacts from product titles.
 * Removes trailing fragments like:
 *   "| NAVY DEER FAIR ISLE ON A MODEL FRONT VIEW @ | FOCUS: 0.0, 1.0, 0.9"
 *   "| FRONT VIEW", "| FOCUS: ...", "@ | ..."
 * Also collapses multiple pipes/whitespace and trims trailing punctuation.
 */
export function cleanProductName(raw?: string | null): string {
  if (!raw) return '';
  let s = decodeHtmlEntities(String(raw));
  // Drop any trailing FOCUS / view / angle / @ metadata
  s = s.replace(/\s*[@|]\s*FOCUS\s*:.*$/i, '');
  s = s.replace(/\s*\|\s*[^|]*\b(FRONT|BACK|SIDE|MODEL)\s+VIEW\b[^|]*$/i, '');
  s = s.replace(/\s*\|\s*FOCUS\s*:.*$/i, '');
  s = s.replace(/\s*@\s*$/g, '');
  // Collapse leftover empty segments and whitespace
  s = s.replace(/\s*\|\s*\|+\s*/g, ' | ').replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/[\s|@-]+$/g, '').trim();
  return s;
}

/** In-place safe Fisher–Yates shuffle. Returns a new array. */
export function shuffleArray<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
