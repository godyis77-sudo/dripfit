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
