/**
 * Guest session management for unauthenticated try-on access.
 * Guest UUID stored in localStorage, server-side tracking via edge functions.
 */

const GUEST_UUID_KEY = 'dripcheck_guest_uuid';
const GUEST_TRYON_COUNT_KEY = 'dripcheck_guest_tryon_count';

export const GUEST_LIFETIME_LIMIT = 3;
export const FREE_DAILY_LIMIT = 5;

/** Get or create a persistent guest UUID */
export function getGuestUuid(): string {
  let uuid = localStorage.getItem(GUEST_UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(GUEST_UUID_KEY, uuid);
  }
  return uuid;
}

/** Get guest try-on count from localStorage (client-side fallback) */
export function getGuestTryOnCount(): number {
  return parseInt(localStorage.getItem(GUEST_TRYON_COUNT_KEY) || '0', 10);
}

/** Increment guest try-on count locally */
export function incrementGuestTryOnCount(): void {
  const current = getGuestTryOnCount();
  localStorage.setItem(GUEST_TRYON_COUNT_KEY, String(current + 1));
}

/** Check if guest has remaining try-ons */
export function guestHasRemainingTryOns(): boolean {
  return getGuestTryOnCount() < GUEST_LIFETIME_LIMIT;
}

/** Get today's date key for daily tracking */
export function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Clear guest data (called after successful auth migration) */
export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_UUID_KEY);
  localStorage.removeItem(GUEST_TRYON_COUNT_KEY);
}
