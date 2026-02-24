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
