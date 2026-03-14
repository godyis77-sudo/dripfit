/**
 * Attribution Provider abstraction layer.
 * Currently uses internal web referral tracking.
 * TODO: Add Branch.io or Adjust provider when mobile deep linking is needed.
 */

export interface AttributionData {
  creator_id: string;       // referrer's user_id
  referee_id: string;       // new user's id
  channel: 'web_referral' | 'branch' | 'adjust' | 'manual';
  referral_code: string;
  promo_code?: string;
  // TODO: device_id for mobile dedup
  device_id?: string;
}

export interface AttributionProvider {
  name: string;
  /** Extract attribution data from current context (URL params, SDK, etc.) */
  getAttribution(): { code: string; channel: string } | null;
}

// ─── Internal Web Referral Provider ─────────────────────────────────────────

const internalWebReferral: AttributionProvider = {
  name: 'internal_web_referral',
  getAttribution() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (!code) return null;
    return { code, channel: 'web_referral' };
  },
};

// TODO: Branch.io provider stub
// const branchProvider: AttributionProvider = {
//   name: 'branch',
//   getAttribution() {
//     // Branch SDK: branch.data() → extract creator_id from deep link data
//     return null;
//   },
// };

// TODO: Adjust provider stub
// const adjustProvider: AttributionProvider = {
//   name: 'adjust',
//   getAttribution() {
//     // Adjust SDK: Adjust.getAttribution() → extract creator_id
//     return null;
//   },
// };

// ─── Provider Registry ──────────────────────────────────────────────────────

const providers: AttributionProvider[] = [
  internalWebReferral,
  // TODO: add branchProvider, adjustProvider here when ready
];

/**
 * Check all registered attribution providers and return first match.
 */
export function resolveAttribution(): { code: string; channel: string } | null {
  for (const provider of providers) {
    const result = provider.getAttribution();
    if (result) return result;
  }
  return null;
}
