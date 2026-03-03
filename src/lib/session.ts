// Guest session management
const SESSION_KEY = 'dripcheck_session_id';

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Onboarding state
const ONBOARDING_KEY = 'dripcheck_onboarded';

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function setOnboarded(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

// Guest mode
const GUEST_KEY = 'dripcheck_guest';

export function isGuestMode(): boolean {
  return localStorage.getItem(GUEST_KEY) === 'true';
}

export function setGuestMode(): void {
  localStorage.setItem(GUEST_KEY, 'true');
}

// Fit preference cache
const FIT_KEY = 'dripcheck_fit';

export function getFitPreference(): 'fitted' | 'regular' | 'relaxed' {
  return (localStorage.getItem(FIT_KEY) as any) || 'regular';
}

export function setFitPreference(fit: 'fitted' | 'regular' | 'relaxed'): void {
  localStorage.setItem(FIT_KEY, fit);
}

// Shopping habit
const SHOP_HABIT_KEY = 'dripcheck_shop_habit';
export type ShoppingHabit = 'online' | 'mix' | 'instore' | 'browser';

export function getShoppingHabit(): ShoppingHabit | null {
  return localStorage.getItem(SHOP_HABIT_KEY) as ShoppingHabit | null;
}

export function setShoppingHabit(habit: ShoppingHabit): void {
  localStorage.setItem(SHOP_HABIT_KEY, habit);
}

// Region / country detection
const REGION_KEY = 'dripcheck_region';

export type UserRegion = 'us' | 'ca' | 'gb' | 'au' | 'fr' | 'de' | 'it' | 'es' | 'other';

const TIMEZONE_REGION_MAP: Record<string, UserRegion> = {
  'America/New_York': 'us', 'America/Chicago': 'us', 'America/Denver': 'us', 'America/Los_Angeles': 'us',
  'America/Toronto': 'ca', 'America/Vancouver': 'ca', 'America/Edmonton': 'ca', 'America/Montreal': 'ca',
  'Europe/London': 'gb', 'Australia/Sydney': 'au', 'Australia/Melbourne': 'au',
  'Europe/Berlin': 'de', 'Europe/Paris': 'fr', 'Europe/Madrid': 'es', 'Europe/Rome': 'it', 'Europe/Amsterdam': 'de',
};

export function detectRegion(): UserRegion {
  const saved = localStorage.getItem(REGION_KEY) as UserRegion | null;
  if (saved) return saved;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = TIMEZONE_REGION_MAP[tz];
    if (region) { localStorage.setItem(REGION_KEY, region); return region; }
    const lang = navigator.language.toLowerCase();
    if (lang.includes('en-us')) return setAndReturn('us');
    if (lang.includes('en-ca') || lang.includes('fr-ca')) return setAndReturn('ca');
    if (lang.includes('en-gb')) return setAndReturn('gb');
    if (lang.includes('en-au')) return setAndReturn('au');
    if (lang.includes('fr-fr')) return setAndReturn('fr');
    if (lang.includes('de-de')) return setAndReturn('de');
    if (lang.includes('it-it')) return setAndReturn('it');
    if (lang.includes('es-es')) return setAndReturn('es');
  } catch { /* ignore */ }
  return 'us';
}

function setAndReturn(r: UserRegion): UserRegion {
  localStorage.setItem(REGION_KEY, r);
  return r;
}

export function getUserRegion(): UserRegion {
  return (localStorage.getItem(REGION_KEY) as UserRegion) || detectRegion();
}

export function setUserRegion(region: UserRegion): void {
  localStorage.setItem(REGION_KEY, region);
}

/** Persist region to profiles table (fire-and-forget). */
export async function persistRegionToDb(userId: string, region: UserRegion): Promise<void> {
  const { supabase } = await import('@/integrations/supabase/client');
  await supabase
    .from('profiles')
    .update({ shopping_region: region } as any)
    .eq('user_id', userId);
}

/** Load region from profiles table, falling back to localStorage. */
export async function loadRegionFromDb(userId: string): Promise<UserRegion> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase
    .from('profiles')
    .select('shopping_region')
    .eq('user_id', userId)
    .single();
  const dbRegion = (data as any)?.shopping_region as UserRegion | null;
  if (dbRegion) {
    localStorage.setItem(REGION_KEY, dbRegion);
    return dbRegion;
  }
  return getUserRegion();
}

// Premium banner dismiss logic
const PREMIUM_DISMISS_KEY = 'dripcheck_premium_dismiss';
const PREMIUM_DISMISS_COUNT_KEY = 'dripcheck_premium_dismiss_count';

export function getPremiumBannerDismissed(): boolean {
  const dismissedAt = localStorage.getItem(PREMIUM_DISMISS_KEY);
  const dismissCount = parseInt(localStorage.getItem(PREMIUM_DISMISS_COUNT_KEY) || '0');
  if (dismissCount >= 2) return true; // permanent
  if (!dismissedAt) return false;
  const elapsed = Date.now() - parseInt(dismissedAt);
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  return elapsed < fourteenDays;
}

export function dismissPremiumBanner(): void {
  const count = parseInt(localStorage.getItem(PREMIUM_DISMISS_COUNT_KEY) || '0') + 1;
  localStorage.setItem(PREMIUM_DISMISS_KEY, Date.now().toString());
  localStorage.setItem(PREMIUM_DISMISS_COUNT_KEY, count.toString());
}
