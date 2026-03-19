import { type ReactElement } from 'react';

/** Flat gold SVG paths for every FeatureIcon name. */
const gold = 'url(#fi-gold)';

const GoldDefs = () => (
  <defs>
    <linearGradient id="fi-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="hsl(45, 88%, 60%)" />
      <stop offset="100%" stopColor="hsl(40, 80%, 42%)" />
    </linearGradient>
  </defs>
);

type SvgBuilder = () => ReactElement;

const s = { strokeWidth: '1.5', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

export const svgIcons: Record<string, SvgBuilder> = {
  // ── Navigation / Core ──
  home: () => (
    <>
      <GoldDefs />
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z" stroke={gold} {...s} />
      <path d="M9 21v-7h6v7" stroke={gold} {...s} />
    </>
  ),
  scan: () => (
    <>
      <GoldDefs />
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" stroke={gold} {...s} />
      <circle cx="12" cy="12" r="4" stroke={gold} {...s} />
      <path d="M12 8v0" stroke={gold} {...s} />
    </>
  ),
  tryon: () => (
    <>
      <GoldDefs />
      <path d="M12 2a4 4 0 014 4v1H8V6a4 4 0 014-4z" stroke={gold} {...s} />
      <path d="M4 9l4-2h8l4 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke={gold} {...s} />
      <path d="M12 11v4M10 13h4" stroke={gold} {...s} />
    </>
  ),
  stylecheck: () => (
    <>
      <GoldDefs />
      <path d="M9 12l2 2 4-4" stroke={gold} {...s} />
      <circle cx="12" cy="12" r="9" stroke={gold} {...s} />
    </>
  ),
  profile: () => (
    <>
      <GoldDefs />
      <circle cx="12" cy="8" r="4" stroke={gold} {...s} />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke={gold} {...s} />
    </>
  ),

  // ── Features ──
  sizeguide: () => (
    <>
      <GoldDefs />
      <path d="M3 5h18v14H3z" stroke={gold} {...s} />
      <path d="M7 5v4M11 5v6M15 5v4M19 5v3" stroke={gold} {...s} />
      <path d="M3 14h4" stroke={gold} {...s} />
    </>
  ),
  post: () => (
    <>
      <GoldDefs />
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={gold} {...s} />
      <path d="M3 15l5-5 4 4 3-3 6 6" stroke={gold} {...s} />
      <circle cx="15.5" cy="7.5" r="1.5" fill={gold} />
    </>
  ),
  crown: () => (
    <>
      <GoldDefs />
      <path d="M2 18L5 8l4 4 3-6 3 6 4-4 3 10z" fill={gold} />
      <path d="M2 18h20" stroke={gold} {...s} />
    </>
  ),
  sparkles: () => (
    <>
      <GoldDefs />
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" fill={gold} />
      <path d="M19 14l.75 2.25L22 17l-2.25.75L19 20l-.75-2.25L16 17l2.25-.75z" fill={gold} />
      <path d="M5 16l.5 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5z" fill={gold} />
    </>
  ),
  shield: () => (
    <>
      <GoldDefs />
      <path d="M12 2l8 4v5c0 5.5-3.8 10-8 11-4.2-1-8-5.5-8-11V6z" stroke={gold} {...s} />
      <path d="M9 12l2 2 4-4" stroke={gold} {...s} />
    </>
  ),
  star: () => (
    <>
      <GoldDefs />
      <path d="M12 2l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.8 3-1.1-6.5L.4 8.9l6.5-.9z" fill={gold} />
    </>
  ),
  zap: () => (
    <>
      <GoldDefs />
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" fill={gold} />
    </>
  ),
  check: () => (
    <>
      <GoldDefs />
      <path d="M5 12l5 5L20 7" stroke={gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  shop: () => (
    <>
      <GoldDefs />
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke={gold} {...s} />
      <path d="M3 6h18" stroke={gold} {...s} />
      <path d="M16 10a4 4 0 01-8 0" stroke={gold} {...s} />
    </>
  ),
  mail: () => (
    <>
      <GoldDefs />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke={gold} {...s} />
      <path d="M22 6l-10 7L2 6" stroke={gold} {...s} />
    </>
  ),
  eye: () => (
    <>
      <GoldDefs />
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={gold} {...s} />
      <circle cx="12" cy="12" r="3" fill={gold} />
    </>
  ),
  chart: () => (
    <>
      <GoldDefs />
      <path d="M3 20h18" stroke={gold} {...s} />
      <rect x="5" y="10" width="3" height="10" rx="0.5" fill={gold} />
      <rect x="10.5" y="6" width="3" height="14" rx="0.5" fill={gold} />
      <rect x="16" y="12" width="3" height="8" rx="0.5" fill={gold} />
    </>
  ),
  globe: () => (
    <>
      <GoldDefs />
      <circle cx="12" cy="12" r="10" stroke={gold} {...s} />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2" stroke={gold} {...s} />
    </>
  ),
  lock: () => (
    <>
      <GoldDefs />
      <rect x="5" y="11" width="14" height="10" rx="2" stroke={gold} {...s} />
      <path d="M8 11V7a4 4 0 018 0v4" stroke={gold} {...s} />
      <circle cx="12" cy="16" r="1" fill={gold} />
    </>
  ),
  users: () => (
    <>
      <GoldDefs />
      <circle cx="9" cy="7" r="3.5" stroke={gold} {...s} />
      <path d="M2 20c0-3 3-5.5 7-5.5s7 2.5 7 5.5" stroke={gold} {...s} />
      <circle cx="17.5" cy="8.5" r="2.5" stroke={gold} {...s} />
      <path d="M19 14.5c2.5.5 4 2 4 4" stroke={gold} {...s} />
    </>
  ),
  store: () => (
    <>
      <GoldDefs />
      <path d="M3 9l1.5-5h15L21 9" stroke={gold} {...s} />
      <path d="M3 9c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 2 2s2-.9 2-2" stroke={gold} {...s} />
      <path d="M5 11v9a1 1 0 001 1h12a1 1 0 001-1v-9" stroke={gold} {...s} />
      <path d="M10 21v-6h4v6" stroke={gold} {...s} />
    </>
  ),
  ruler: () => (
    <>
      <GoldDefs />
      <rect x="2" y="7" width="20" height="10" rx="1" stroke={gold} {...s} />
      <path d="M6 7v4M10 7v6M14 7v4M18 7v3" stroke={gold} {...s} />
    </>
  ),
  shirt: () => (
    <>
      <GoldDefs />
      <path d="M8 2l-5 4 3 2v12a1 1 0 001 1h10a1 1 0 001-1V8l3-2-5-4-2 3h-4z" stroke={gold} {...s} />
    </>
  ),
  message: () => (
    <>
      <GoldDefs />
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={gold} {...s} />
    </>
  ),
  heart: () => (
    <>
      <GoldDefs />
      <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.8 1-1.1a5.5 5.5 0 000-7.5z" fill={gold} />
    </>
  ),
  share: () => (
    <>
      <GoldDefs />
      <circle cx="18" cy="5" r="3" stroke={gold} {...s} />
      <circle cx="6" cy="12" r="3" stroke={gold} {...s} />
      <circle cx="18" cy="19" r="3" stroke={gold} {...s} />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" stroke={gold} {...s} />
    </>
  ),
  // ── Gender silhouettes ──
  man: () => (
    <>
      <GoldDefs />
      {/* Head */}
      <circle cx="12" cy="5.5" r="2.8" fill={gold} />
      {/* Torso */}
      <path d="M8 10h8v5H8z" fill={gold} rx="1" />
      {/* Arms */}
      <rect x="5" y="10" width="3" height="8" rx="1.5" fill={gold} />
      <rect x="16" y="10" width="3" height="8" rx="1.5" fill={gold} />
      {/* Legs */}
      <rect x="8.5" y="15" width="3" height="7" rx="1.5" fill={gold} />
      <rect x="12.5" y="15" width="3" height="7" rx="1.5" fill={gold} />
    </>
  ),
  woman: () => (
    <>
      <GoldDefs />
      {/* Head */}
      <circle cx="12" cy="5.5" r="2.8" fill={gold} />
      {/* Torso */}
      <path d="M9 10h6v4H9z" fill={gold} />
      {/* Arms */}
      <rect x="5.5" y="10" width="2.5" height="7" rx="1.2" fill={gold} />
      <rect x="16" y="10" width="2.5" height="7" rx="1.2" fill={gold} />
      {/* Skirt/dress */}
      <path d="M7 14h10l-1.5 8h-7z" fill={gold} />
    </>
  ),
  manwoman: () => (
    <>
      <GoldDefs />
      {/* Man - left */}
      <circle cx="7.5" cy="5" r="2.2" fill={gold} />
      <path d="M5 9h5v4H5z" fill={gold} />
      <rect x="3" y="9" width="2" height="6" rx="1" fill={gold} />
      <rect x="10" y="9" width="2" height="6" rx="1" fill={gold} />
      <rect x="5.2" y="13" width="2.2" height="6" rx="1" fill={gold} />
      <rect x="7.8" y="13" width="2.2" height="6" rx="1" fill={gold} />
      {/* Woman - right */}
      <circle cx="16.5" cy="5" r="2.2" fill={gold} />
      <path d="M14.5 9h4v3h-4z" fill={gold} />
      <rect x="12.5" y="9" width="2" height="5.5" rx="1" fill={gold} />
      <rect x="19.5" y="9" width="2" height="5.5" rx="1" fill={gold} />
      <path d="M13.5 12h6l-1 7h-4z" fill={gold} />
    </>
  ),
};
