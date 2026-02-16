

# DripCheck Luxury Aesthetic Refresh

## Overview
Shift from the current bold neon/streetwear palette to a refined, soft luxury aesthetic -- think high-end fashion apps like Zara, COS, or Bottega Veneta. Muted tones, smooth gradients, and elegant typography.

## 1. Color Palette Update (src/index.css)

Replace the current neon pink/purple/gold with a sophisticated luxury palette:

- **Primary**: Soft rose / dusty mauve (`350 30% 60%`) -- elegant, not aggressive
- **Accent**: Muted lavender (`260 25% 65%`) -- subtle and refined
- **Gold**: Warm champagne (`38 40% 70%`) -- luxury without being flashy
- **Background (dark)**: Rich charcoal with warm undertone (`240 10% 8%`)
- **Cards**: Slightly lighter, with warmth (`240 8% 12%`)
- **Borders**: Very subtle, barely visible (`240 6% 16%`)
- **Muted text**: Softer gray with warmth (`240 5% 50%`)

Update `--drip-glow`, `--drip-accent`, `--drip-gold` to match.

Update gradient utilities (`.gradient-drip`, `.gradient-drip-text`) to use the softer rose-to-lavender-to-champagne palette. Reduce glow intensity on `.glow-primary` for a more understated shine.

## 2. Button Refinement (src/components/ui/button.tsx)

- Soften border-radius slightly (keep `rounded-2xl` but ensure smooth feel)
- No harsh box-shadows; use very subtle, diffused shadows instead
- Smooth `transition-all duration-300 ease-out` for all interactive states
- Default variant gets the soft gradient instead of a flat color

## 3. Welcome Page Polish (src/pages/Welcome.tsx)

- **Background blurs**: Reduce opacity further (5-8% instead of 10%) for subtlety
- **Buttons**: All CTAs get smooth gradient with soft shadow, uniform sizing (h-14), generous padding
- **Glass cards**: Increase blur, reduce border opacity for a more refined frosted glass
- **Animations**: Slow down slightly for elegance (0.7s instead of 0.5s fade-ins, gentler spring configs)
- **Typography**: Let Space Grotesk breathe -- slightly increased letter-spacing on headings
- **Hover effects**: Gentle scale (1.02 instead of 1.03), slower transitions

## 4. Utility Class Updates (src/index.css)

- `.glass`: Increase blur to 20px, reduce background opacity further
- `.glow-primary`: Much softer glow (lower opacity, wider spread)
- `.glow-accent`: Same treatment -- whisper-soft, not loud
- Add `.btn-luxury` utility: subtle gradient, smooth shadow, elegant hover state

## Files Changed
1. **src/index.css** -- Soft luxury color variables, refined utility classes
2. **src/components/ui/button.tsx** -- Smoother transitions, softer styling defaults
3. **src/pages/Welcome.tsx** -- Gentler animations, refined card/button styling, reduced glow intensity

