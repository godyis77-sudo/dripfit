// PostHog analytics — deferred initialization to reduce main-thread blocking

import type { PostHog } from 'posthog-js';
import { isNativeIOS } from '@/lib/platform';

const _envKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_KEY = (_envKey && _envKey.startsWith('phc_')) ? _envKey : 'phc_YCzbtL0TcOZ0YzB0aGv2kXIYoGuscc09iXqXHIfuoMZ';
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com';

let ph: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

/** Lazily load and init PostHog once */
function getPostHog(): Promise<PostHog | null> {
  if (ph) return Promise.resolve(ph);
  if (!POSTHOG_KEY) return Promise.resolve(null);
  if (initPromise) return initPromise;

  initPromise = import('posthog-js').then((mod) => {
    const posthog = mod.default;

    // On native iOS, disable device_id to avoid requiring ATT prompt.
    // PostHog will still track events but won't use a cross-app identifier.
    const oniOS = isNativeIOS();

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      capture_pageview: true,
      persistence: oniOS ? 'localStorage' : 'localStorage+cookie',
      // Disable cross-app tracking properties on iOS to avoid ATT requirement
      ...(oniOS && {
        disable_cookie: true,
        ip: false,
        property_denylist: ['$device_id'],
      }),
    });
    ph = posthog;
    return posthog;
  }).catch(() => {
    initPromise = null;
    return null;
  });

  return initPromise;
}

/** Trigger PostHog load on first user interaction or after idle timeout */
function scheduleInit() {
  const events = ['click', 'scroll', 'keydown', 'touchstart'] as const;
  let triggered = false;

  const trigger = () => {
    if (triggered) return;
    triggered = true;
    events.forEach((e) => window.removeEventListener(e, trigger, { capture: true }));
    getPostHog();
  };

  // Load on first interaction
  events.forEach((e) => window.addEventListener(e, trigger, { capture: true, once: true, passive: true } as AddEventListenerOptions));

  // Fallback: load after idle (max 8s)
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(trigger, { timeout: 8000 });
  } else {
    setTimeout(trigger, 4000);
  }
}

scheduleInit();

// --- public API (fire-and-forget, never blocks UI) ---

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
  | 'creator_commission_earned'
  | 'gallery_tryon_click'
  | 'gallery_hero_tryon'
  | 'demo_tryon_cta_click'
  | 'photo_quality_tip_viewed'
  | 'drip_card_render_failed'
  | 'bg_swap_opened'
  | 'bg_category_selected'
  | 'bg_background_selected'
  | 'bg_composite_shared'
  | 'bg_composite_saved'
  | 'bg_search_photo_selected'
  | 'bg_user_upload'
  | 'bg_user_bg_selected'
  | 'bg_user_bg_deleted'
  | 'bg_page_selected'
  | 'bg_page_search_selected'
  | 'bg_page_downloaded'
  | 'bg_page_category'
  | 'outfit_build_started'
  | 'outfit_saved'
  | 'outfit_edit_started'
  | 'price_watch_added'
  | 'price_watch_removed'
  | 'price_drops_viewed'
  | 'onetap_photo_uploaded'
  | 'onetap_garment_tapped'
  | 'tryon_drip_card_share_start'
  | 'tryon_drip_card_generated'
  | 'tryon_drip_card_downloaded'
  | 'tryon_add_item_to_result'
  | 'style_check_share'
  | 'fit_rec_click'
  | 'share_nudge_copy_link'
  | 'share_nudge_native'
  | 'share_nudge_whatsapp'
  | 'invite_copy_link'
  | 'invite_native_share'
  | 'invite_sms'
  | 'invite_whatsapp'
  | 'share_story_generated'
  | 'share_post_link_copied'
  | 'closet_cop'
  | 'closet_drop'
  | 'premium_started_ios_iap'
  | 'premium_restore_ios';

export function trackEvent(event: FunnelEvent, meta?: Record<string, unknown>) {
  try {
    getPostHog().then((p) => p?.capture(event, meta));

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
    getPostHog().then((p) => p?.identify(userId, traits));
    if (import.meta.env.DEV) {
      console.log(`[analytics] identify`, userId, traits ?? '');
    }
  } catch {
    // never break UI over analytics
  }
}

export function resetAnalytics() {
  try {
    getPostHog().then((p) => p?.reset());
  } catch {
    // never break UI over analytics
  }
}
