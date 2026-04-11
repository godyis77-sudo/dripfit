// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DRIPFIT CHECK — BRAND DESIGN SYSTEM
// This is the single source of truth for all visual decisions.
// Import from here. Never hardcode colors, font classes, or
// spacing values directly in components.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── COLORS ──
export const BRAND = {
  gold:           'hsl(var(--primary))',
  goldHover:      'hsl(var(--primary) / 0.85)',
  goldSubtle:     'hsl(var(--primary) / 0.10)',
  goldBorder:     'hsl(var(--primary) / 0.25)',

  bgBase:         'hsl(var(--background))',
  bgSurface:      'rgba(255, 255, 255, 0.03)',
  bgSurfaceHover: 'rgba(255, 255, 255, 0.06)',

  borderSubtle:   'rgba(255, 255, 255, 0.06)',
  borderMedium:   'rgba(255, 255, 255, 0.10)',

  textPrimary:    'hsl(var(--foreground))',
  textSecondary:  'hsl(var(--foreground) / 0.85)',  // zinc-300 equiv
  textTertiary:   'hsl(var(--muted-foreground))',    // zinc-400 equiv
  textMuted:      'hsl(var(--muted-foreground) / 0.7)',
  textGhost:      'hsl(var(--muted-foreground) / 0.5)',
} as const;

// ── TYPOGRAPHY CLASS PRESETS ──
// Use these as className strings. They enforce the exact
// font, size, weight, tracking, and color for each text tier.

export const TYPE = {
  // Tier 1 — Brand wordmark (DRIPFIT only)
  brandMark: 'font-display text-[28px] font-extrabold tracking-tight text-foreground uppercase',

  // Tier 2 — Section headlines & card titles
  headline: 'font-display text-[22px] font-semibold text-foreground',
  headlineLg: 'font-display text-3xl font-bold text-foreground tracking-tight',
  headlineSm: 'font-display text-xl font-semibold text-foreground',

  // Tier 3 — Taglines & section subtitles (uppercase, spaced)
  tagline: 'font-sans text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground',

  // Tier 4 — Body text & card subtitles (benefit copy)
  body: 'font-sans text-sm text-muted-foreground leading-relaxed',
  bodyBright: 'font-sans text-sm text-foreground/85 leading-relaxed',

  // Tier 5 — Data & metadata (monospace, factual)
  data: 'font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground/60',
  dataGold: 'font-mono text-[10px] tracking-[0.12em] uppercase text-primary',

  // Tier 6 — Labels & navigation
  label: 'font-sans text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground',
  labelActive: 'font-sans text-[10px] font-semibold tracking-[0.1em] uppercase text-primary',

  // Tier 7 — Prices
  price: 'font-mono text-sm font-medium text-foreground',
  priceEditorial: 'font-display text-lg font-semibold text-foreground',

  // Brand name on product cards
  brandName: 'font-mono text-[10px] tracking-widest uppercase text-muted-foreground',

  // Product title
  productTitle: 'font-sans text-sm text-foreground/90 line-clamp-1',
} as const;

// ── COMPONENT CLASS PRESETS ──

export const CARD = {
  // Standard glass card (home cards, feature cards, data cards)
  glass: 'bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl',
  glassHover: 'bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] transition-colors',

  // Editorial card (full-bleed photo cards)
  editorial: 'relative rounded-2xl overflow-hidden',
  editorialGradient: 'absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent',

  // Product card image container
  productImage: 'bg-secondary rounded-xl overflow-hidden flex items-center justify-center aspect-square',
  productImagePortrait: 'bg-secondary rounded-xl overflow-hidden flex items-center justify-center aspect-[3/4]',
} as const;

export const BUTTON = {
  // Primary — gold background, dark text
  primary: 'bg-primary hover:bg-primary/85 text-primary-foreground font-sans font-semibold text-sm tracking-wide rounded-full h-12 px-8 flex items-center justify-center gap-2 transition-colors',

  // Secondary — frosted glass, white text
  secondary: 'bg-white/[0.06] backdrop-blur-md border border-white/[0.1] text-foreground font-sans font-medium text-sm rounded-full h-12 px-6 flex items-center justify-center gap-2 hover:bg-white/[0.1] transition-colors',

  // Ghost — minimal, just text
  ghost: 'text-muted-foreground hover:text-foreground font-sans text-xs tracking-wider uppercase transition-colors',

  // Text link — gold text, no container
  link: 'text-primary hover:text-primary/85 font-sans text-xs tracking-wider uppercase font-semibold transition-colors',

  // Small pill (filter chips, tags)
  chip: 'px-4 py-2 rounded-full border text-xs tracking-wide transition-all font-sans',
  chipActive: 'border-primary text-primary bg-primary/10',
  chipInactive: 'border-white/[0.08] text-muted-foreground hover:border-white/[0.2]',
} as const;

export const NAV = {
  bar: 'fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-white/[0.04] z-50',
  iconActive: 'text-primary',
  iconInactive: 'text-muted-foreground/50',
  labelActive: 'text-primary text-[9px] tracking-wider',
  labelInactive: 'text-muted-foreground/50 text-[9px] tracking-wider',
} as const;

export const SPACING = {
  pagePx: 'px-6',
  sectionGap: 'mt-10',
  cardGap: 'gap-3',
  microGap: 'gap-1.5',
} as const;

// ── PRODUCT IMAGE STYLING ──
export const PRODUCT = {
  imageContainer: 'bg-secondary rounded-xl overflow-hidden flex items-center justify-center p-3',
  image: 'object-contain w-full h-full',
} as const;

// ── UTILITY ──
export const GOLD_CHECK = { color: 'hsl(var(--primary))' };
