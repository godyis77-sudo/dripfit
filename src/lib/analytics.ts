// PostHog analytics — falls back to console.log if key is not set

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://app.posthog.com';

let initialized = false;

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: true,
    persistence: 'localStorage+cookie',
  });
  initialized = true;
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
  | 'cart_shop_clickout';

export function trackEvent(event: FunnelEvent, meta?: Record<string, unknown>) {
  try {
    if (initialized) {
      posthog.capture(event, meta);
    }

    // Log to console in dev
    if (import.meta.env.DEV) {
      console.log(`[analytics] ${event}`, meta ?? '');
    }

    // Store locally for lightweight funnel debugging
    const log = JSON.parse(sessionStorage.getItem('df_events') || '[]');
    log.push({ event, ts: Date.now(), ...(meta ?? {}) });
    sessionStorage.setItem('df_events', JSON.stringify(log.slice(-100)));
  } catch {
    // never break UI over analytics
  }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  try {
    if (initialized) {
      posthog.identify(userId, traits);
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
    if (initialized) {
      posthog.reset();
    }
  } catch {
    // never break UI over analytics
  }
}
