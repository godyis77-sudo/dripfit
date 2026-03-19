// PostHog analytics — lazy-loaded to reduce initial bundle size

const POSTHOG_KEY = (import.meta.env.VITE_POSTHOG_KEY as string | undefined) || 'phc_YCzbtL0TcOZ0YzB0aGv2kXIYoGuscc09iXqXHIfuoMZ';
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com';

let posthogInstance: typeof import('posthog-js').default | null = null;
let initPromise: Promise<void> | null = null;

function lazyInit(): Promise<void> {
  if (!POSTHOG_KEY) return Promise.resolve();
  if (posthogInstance) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = import('posthog-js').then((mod) => {
    const posthog = mod.default;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      capture_pageview: true,
      persistence: 'localStorage+cookie',
    });
    posthogInstance = posthog;
  }).catch(() => {
    // never break UI over analytics
  });

  return initPromise;
}

// Kick off loading after first interaction or idle
if (typeof window !== 'undefined' && POSTHOG_KEY) {
  const start = () => {
    lazyInit();
    window.removeEventListener('click', start);
    window.removeEventListener('scroll', start);
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => lazyInit(), { timeout: 4000 });
  } else {
    setTimeout(() => lazyInit(), 3000);
  }
  window.addEventListener('click', start, { once: true, passive: true });
  window.addEventListener('scroll', start, { once: true, passive: true });
}

type FunnelEvent =
  | 'home_start_scan_click'
  | 'home_tryon_click'
  | 'home_fitcheck_click'
  | 'auth_started'
  | 'auth_completed'
  | 'onboarding_fit_selected'
  | 'onboarding_completed'
  | 'scan_started'
  | 'scan_front_captured'
  | 'scan_side_captured'
  | 'scan_completed'
  | 'results_viewed'
  | 'results_saved'
  | 'results_tryon_click'
  | 'tryon_started'
  | 'tryon_photo_uploaded'
  | 'tryon_clothing_uploaded'
  | 'tryon_generated'
  | 'tryon_saved'
  | 'tryon_posted'
  | 'fitcheck_post_started'
  | 'fitcheck_posted'
  | 'fitcheck_reaction'
  | 'fitcheck_voted'
  | 'community_rated'
  | 'retailer_click'
  | 'profile_export'
  | 'share_action'
  | 'save_action'
  | 'product_link_pasted'
  | 'retailer_selected'
  | 'shop_clickout'
  | 'saved_item_added'
  | 'saved_item_removed'
  | 'premium_viewed'
  | 'premium_started'
  | 'fit_feedback_submitted'
  | 'result_viewed'
  | 'save_item'
  | 'vote_cast'
  | 'trial_started'
  | 'measurement_adjusted'
  | 'home_quick_scan'
  | 'home_quick_tryon'
  | 'home_quick_sizeguide'
  | 'home_quick_stylecheck'
  | 'postscan_tryon_click'
  | 'postscan_shop_click'
  | 'postscan_fitcheck_click'
  | 'postscan_dismissed'
  | 'onboarding_splash_done'
  | 'onboarding_carousel_skip'
  | 'onboarding_carousel_done'
  | 'onboarding_shopping_habit'
  | 'onboarding_scan_prompt_skip'
  | 'scan_results_shared'
  | 'quickpick_retailer_clicked'
  | 'tryon_liked'
  | 'tryon_posted_to_community'
  | 'wardrobe_added_from_tryon'
  | 'tryon_shared_instagram'
  | 'user_followed'
  | 'user_unfollowed'
  | 'onboarding_guest_mode'
  | 'auth_guest_mode'
  | 'vote_submitted'
  | 'region_changed'
  | 'tryon_accessory_started'
  | 'tryon_accessory_generated'
  | 'catalog_product_clicked'
  | 'catalog_product_preview'
  | 'preferred_brand_added'
  | 'preferred_brand_removed'
  | 'browse_product_preview'
  | 'browse_product_clicked'
  | 'catalog_product_tryon'
  | 'fit_preference_changed'
  | 'badge_clickout'
  | 'fitcheck_post_deleted'
  | 'wardrobe_add_from_look'
  | 'fitcheck_comment'
  | 'onboarding_gender_selected'
  | 'cart_add'
  | 'cart_remove'
  | 'cart_clear'
  | 'cart_shop_clickout'
  | 'cart_tryon_click'
  | 'tryon_navigate'
  | 'tryon_from_detail_sheet'
  | 'tryon_from_wardrobe_detail'
  | 'account_deleted'
  | 'fitcheck_caption_updated'
  | 'retailer_clickout_opened'
  | 'retailer_clickout_cancelled'
  | 'referral_link_copied'
  | 'referral_signup_attributed'
  | 'creator_commission_earned';

export function trackEvent(event: FunnelEvent, meta?: Record<string, unknown>) {
  try {
    if (posthogInstance) {
      posthogInstance.capture(event, meta);
    } else {
      // Queue event and send once loaded
      lazyInit().then(() => {
        posthogInstance?.capture(event, meta);
      });
    }

    if (import.meta.env.DEV) {
      console.log(`[analytics] ${event}`, meta ?? '');
    }

    const log = JSON.parse(sessionStorage.getItem('df_events') || '[]');
    log.push({ event, ts: Date.now(), ...(meta ?? {}) });
    sessionStorage.setItem('df_events', JSON.stringify(log.slice(-100)));
  } catch {
    // never break UI over analytics
  }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  try {
    if (posthogInstance) {
      posthogInstance.identify(userId, traits);
    } else {
      lazyInit().then(() => {
        posthogInstance?.identify(userId, traits);
      });
    }
    if (import.meta.env.DEV) {
      console.log(`[analytics] identify`, userId, traits ?? '');
    }
  } catch {
    // never break UI over analytics
  }
}

export function resetAnalytics() {
  try {
    posthogInstance?.reset();
  } catch {
    // never break UI over analytics
  }
}
