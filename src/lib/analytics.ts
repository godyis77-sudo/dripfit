// Lightweight funnel analytics — logs events for now, can be wired to any backend later.

type FunnelEvent =
  | 'home_start_scan_click'
  | 'scan_front_captured'
  | 'scan_side_captured'
  | 'scan_completed'
  | 'results_viewed'
  | 'tryon_generated'
  | 'community_rated';

export function trackEvent(event: FunnelEvent, meta?: Record<string, unknown>) {
  try {
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
