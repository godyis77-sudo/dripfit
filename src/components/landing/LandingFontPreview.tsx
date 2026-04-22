// TEMPORARY — typography comparison for picking final hero/CTA headline font.
// Remove once a direction is selected.

const SAMPLES = [
  {
    tag: 'OPTION B',
    label: 'Modern Editorial — Instrument Serif',
    note: 'Sophisticated, high-fashion (Aesop / SSENSE).',
    line1Style: {
      fontFamily: "'Instrument Serif', Georgia, serif",
      fontWeight: 400,
      fontStyle: 'normal' as const,
      letterSpacing: '-0.01em',
    },
    line2Style: {
      fontFamily: "'Instrument Serif', Georgia, serif",
      fontWeight: 400,
      fontStyle: 'italic' as const,
      letterSpacing: '-0.01em',
    },
  },
  {
    tag: 'OPTION C  ★ RECOMMENDED',
    label: 'Brutal Sans + Italic Accent — Archivo Black + Playfair Italic',
    note: 'High graphic punch, streetwear-adjacent.',
    line1Style: {
      fontFamily: "'Archivo Black', sans-serif",
      fontWeight: 900,
      fontStyle: 'normal' as const,
      letterSpacing: '-0.02em',
      textTransform: 'uppercase' as const,
    },
    line2Style: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 500,
      fontStyle: 'italic' as const,
      letterSpacing: '0',
    },
  },
  {
    tag: 'OPTION D',
    label: 'Anton + Italic Serif',
    note: 'Maximum "Hypebeast" statement energy.',
    line1Style: {
      fontFamily: "'Anton', sans-serif",
      fontWeight: 400,
      fontStyle: 'normal' as const,
      letterSpacing: '0.01em',
      textTransform: 'uppercase' as const,
    },
    line2Style: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 500,
      fontStyle: 'italic' as const,
      letterSpacing: '0',
    },
  },
];

export default function LandingFontPreview() {
  return (
    <section className="py-16 border-y border-primary/30 bg-secondary/[0.04]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <span className="inline-block text-[10px] tracking-[.22em] uppercase font-mono text-primary mb-3 px-3 py-1 border border-primary/40 rounded-full">
            Font Preview · Pick One
          </span>
          <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
            Each option shows how the hero & Final CTA headline would read.
            Reply <span className="text-primary font-mono">B</span>, <span className="text-primary font-mono">C</span>, or <span className="text-primary font-mono">D</span>.
          </p>
        </div>

        <div className="space-y-10">
          {SAMPLES.map((s) => (
            <div
              key={s.tag}
              className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-sm p-7 md:p-10"
            >
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <span className="text-[10px] tracking-[.22em] uppercase font-mono text-primary/90">
                  {s.tag}
                </span>
                <span className="text-[11px] text-muted-foreground/70 font-mono">
                  {s.label}
                </span>
              </div>

              {/* Headline sample */}
              <h3
                className="leading-[1.02] text-foreground"
                style={{ ...s.line1Style, fontSize: 'clamp(34px, 6vw, 60px)' }}
              >
                Know your fit.
              </h3>
              <h3
                className="leading-[1.02] text-primary mt-1"
                style={{ ...s.line2Style, fontSize: 'clamp(34px, 6vw, 60px)' }}
              >
                Own your drip.
              </h3>

              {/* Final CTA sample */}
              <div className="mt-6 pt-6 border-t border-border/30">
                <h4
                  className="leading-[1.04] text-foreground"
                  style={{ ...s.line1Style, fontSize: 'clamp(28px, 5vw, 48px)' }}
                >
                  Stop praying.
                </h4>
                <h4
                  className="leading-[1.04] text-primary mt-1"
                  style={{ ...s.line2Style, fontSize: 'clamp(28px, 5vw, 48px)' }}
                >
                  It fits.
                </h4>
              </div>

              <p className="mt-5 text-xs text-muted-foreground/70 italic">{s.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
