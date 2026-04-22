import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Check, X, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { useWeeklyOutfits, type WeeklyOutfit } from '@/hooks/useWeeklyOutfits';
import { useAuth } from '@/hooks/useAuth';
import { shuffleArray } from '@/lib/utils';
import DecorativeSilhouette from '@/components/ui/DecorativeSilhouette';

type DeckEntry =
  | { kind: 'product'; outfit: WeeklyOutfit }
  | { kind: 'gate'; id: string; copsSoFar: number };

const SWIPE_THRESHOLD_RATIO = 0.3; // 30% of card width
const ROTATE_MAX = 15;

const WeeklySwipeDeck = () => {
  const navigate = useNavigate();
  const { userGender, genderLoaded, loading: authLoading, user } = useAuth();
  const hasScan = !!user; // proxy — guests have no verified size
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;
  const ready = !authLoading && genderLoaded;
  const { data: outfits, isLoading } = useWeeklyOutfits(ready ? mappedGender : '__wait__');

  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [cops, setCops] = useState(0);
  const [drops, setDrops] = useState(0);
  const [stamp, setStamp] = useState<'COP' | null>(null);

  const readyOutfits = useMemo(() => {
    if (!outfits) return [];
    const list = outfits.filter(o => o.items.length > 0 && o.hero_image_url);
    return shuffleArray(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfits?.length]);

  const occasions = useMemo(() => {
    const seen = new Map<string, { label: string }>();
    readyOutfits.forEach(o => {
      if (!seen.has(o.occasion)) seen.set(o.occasion, { label: o.occasion_label });
    });
    return Array.from(seen.entries()).map(([key, val]) => ({ key, ...val }));
  }, [readyOutfits]);

  const filtered = useMemo(() => {
    if (!activeOccasion) return readyOutfits;
    return readyOutfits.filter(o => o.occasion === activeOccasion);
  }, [readyOutfits, activeOccasion]);

  // Reset deck index when filter changes
  const handleOccasion = (key: string | null) => {
    setActiveOccasion(key);
    setIndex(0);
  };

  // Build deck with gate cards every 4 product swipes
  const deck = useMemo<DeckEntry[]>(() => {
    const out: DeckEntry[] = [];
    let copsSeen = 0;
    filtered.forEach((o, i) => {
      out.push({ kind: 'product', outfit: o });
      // After every 4 products, insert a gate
      if ((i + 1) % 4 === 0 && i < filtered.length - 1) {
        out.push({ kind: 'gate', id: `gate-${i}`, copsSoFar: copsSeen });
        copsSeen = 0;
      }
    });
    return out;
  }, [filtered]);

  const advance = useCallback(() => setIndex(i => i + 1), []);

  const handleVerdict = useCallback((verdict: 'cop' | 'drop') => {
    if (verdict === 'cop') {
      setCops(c => c + 1);
      setStamp('COP');
      setTimeout(() => setStamp(null), 600);
    } else {
      setDrops(d => d + 1);
    }
    setTimeout(advance, 280);
  }, [advance]);

  if (isLoading && readyOutfits.length === 0) {
    return (
      <div className="mt-2 mb-4">
        <div className="h-5 w-40 rounded bg-white/5 animate-pulse mb-3" />
        <div className="h-[60vh] rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (readyOutfits.length === 0) return null;

  const visible = deck.slice(index, index + 3); // top + 2 behind
  const exhausted = index >= deck.length;

  return (
    <div className="mt-2 mb-4">
      {/* Section divider */}
      <div className="flex justify-center mb-5">
        <div className="h-px w-20" style={{ background: 'rgba(200,169,81,0.2)' }} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-display text-[22px] font-semibold text-foreground tracking-tight">
            This Week's Drip
          </h2>
          <p className="font-sans text-[13px] font-medium tracking-[0.15em] uppercase text-foreground/70 mt-0.5">
            Curated fits · Swipe to verdict
          </p>
        </div>
      </div>

      {/* Category tabs */}
      {occasions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
          <OccasionPill active={!activeOccasion} onClick={() => handleOccasion(null)} label="All" />
          {occasions.map(oc => (
            <OccasionPill
              key={oc.key}
              active={activeOccasion === oc.key}
              onClick={() => handleOccasion(oc.key)}
              label={oc.label}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="flex justify-end mb-3">
        <p className="text-[10px] tracking-[0.18em] uppercase font-mono text-white/40">
          <span className="text-primary/80">{cops}</span> copped <span className="opacity-30">·</span>{' '}
          <span className="text-white/60">{drops}</span> dropped
        </p>
      </div>

      {/* Card stack */}
      <div className="relative w-full" style={{ height: '70vh', maxHeight: 640 }}>
        {/* COP stamp overlay */}
        <AnimatePresence>
          {stamp === 'COP' && (
            <motion.div
              key="cop-stamp"
              initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
              animate={{ opacity: 0.32, scale: 1, rotate: -8 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
            >
              <div
                className="px-10 py-3 border-2 border-primary rounded-sm"
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: '64px',
                  letterSpacing: '0.08em',
                  color: 'hsl(var(--primary))',
                }}
              >
                COP
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {exhausted ? (
          <EndCard
            cops={cops}
            drops={drops}
            onRestart={() => { setIndex(0); setCops(0); setDrops(0); }}
          />
        ) : (
          visible
            .slice()
            .reverse()
            .map((entry, i) => {
              // i=0 is the deepest in stack, last is topmost
              const stackIndex = visible.length - 1 - i;
              const isTop = stackIndex === 0;
              const scale = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.95 : 0.9;
              const yOffset = stackIndex * 8;
              const opacity = stackIndex === 0 ? 1 : stackIndex === 1 ? 0.85 : 0.55;
              const key = entry.kind === 'product' ? entry.outfit.id : entry.id;

              if (entry.kind === 'gate') {
                return (
                  <StackedShell key={key} scale={scale} yOffset={yOffset} opacity={opacity} zIndex={10 - stackIndex}>
                    {isTop ? (
                      <GateCard
                        cops={cops}
                        onCTA={() => navigate('/auth?mode=signup&returnTo=/scan')}
                        onDismiss={advance}
                      />
                    ) : (
                      <GateCardPreview cops={cops} />
                    )}
                  </StackedShell>
                );
              }

              return (
                <SwipeCard
                  key={key}
                  outfit={entry.outfit}
                  hasScan={hasScan}
                  isTop={isTop}
                  scale={scale}
                  yOffset={yOffset}
                  opacity={opacity}
                  zIndex={10 - stackIndex}
                  onVerdict={handleVerdict}
                  onTap={() => navigate(`/outfit/${entry.outfit.id}`)}
                />
              );
            })
        )}
      </div>

      {/* Tap controls */}
      {!exhausted && (
        <div className="flex items-center justify-center gap-10 mt-6">
          <button
            onClick={() => handleVerdict('drop')}
            aria-label="Drop"
            className="h-14 w-14 rounded-full bg-white/[0.04] border border-white/15 text-white/70 flex items-center justify-center active:scale-90 transition-transform hover:bg-white/[0.07]"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => handleVerdict('cop')}
            aria-label="Cop"
            className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_30px_-6px_hsl(var(--primary)/0.6)] hover:opacity-95"
          >
            <Check className="h-7 w-7" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Pieces ──────────────────────────────────────────────────────── */

function OccasionPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border backdrop-blur-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
        active ? 'bg-primary/8 border-primary/20 text-primary' : 'bg-white/5 border-white/10 text-white/50'
      }`}
    >
      <span className={`inline-block w-[5px] h-[5px] rounded-full shrink-0 ${active ? 'bg-primary' : 'bg-white/20'}`} />
      {label}
    </button>
  );
}

function StackedShell({
  scale, yOffset, opacity, zIndex, children,
}: { scale: number; yOffset: number; opacity: number; zIndex: number; children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-x-2 top-0 bottom-0 rounded-2xl overflow-hidden"
      style={{ zIndex }}
      initial={{ scale, y: yOffset, opacity }}
      animate={{ scale, y: yOffset, opacity }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}

function SwipeCard({
  outfit, hasScan, isTop, scale, yOffset, opacity, zIndex, onVerdict, onTap,
}: {
  outfit: WeeklyOutfit; hasScan: boolean; isTop: boolean;
  scale: number; yOffset: number; opacity: number; zIndex: number;
  onVerdict: (v: 'cop' | 'drop') => void;
  onTap: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-ROTATE_MAX, 0, ROTATE_MAX]);
  const grayscale = useTransform(x, [-200, 0], [1, 0]);
  const filter = useTransform(grayscale, (g) => `grayscale(${g})`);
  const goldGlow = useTransform(x, [0, 200], [0, 0.5]);
  const goldOverlayOpacity = useTransform(goldGlow, (g) => g);

  const brand = outfit.items.find(i => i.brand)?.brand ?? '';
  const productName = outfit.title;
  const price = outfit.total_price_cents;

  const onDragEnd = (_: any, info: PanInfo) => {
    const w = window.innerWidth;
    const threshold = w * SWIPE_THRESHOLD_RATIO;
    if (info.offset.x > threshold) {
      // fly right
      onVerdict('cop');
    } else if (info.offset.x < -threshold) {
      onVerdict('drop');
    }
    // else spring back automatically (framer-motion does it)
  };

  if (!isTop) {
    // Static card behind — no drag
    return (
      <motion.div
        className="absolute inset-x-2 top-0 bottom-0 rounded-2xl overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]"
        style={{ zIndex }}
        initial={{ scale, y: yOffset, opacity }}
        animate={{ scale, y: yOffset, opacity }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <CardVisual outfit={outfit} hasScan={hasScan} brand={brand} productName={productName} price={price} dim />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-x-2 top-0 bottom-0 rounded-2xl overflow-hidden shadow-[0_25px_60px_-20px_rgba(0,0,0,0.8)] cursor-grab active:cursor-grabbing"
      style={{ x, rotate, filter, zIndex, touchAction: 'pan-y' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
      onClick={() => {
        // ignore taps that were drags
        if (Math.abs(x.get()) < 8) onTap();
      }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ x: x.get() > 0 ? 600 : -600, opacity: 0, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      whileTap={{ scale: 0.99 }}
    >
      <CardVisual outfit={outfit} hasScan={hasScan} brand={brand} productName={productName} price={price} />
      {/* Gold shimmer overlay on right swipe */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: goldOverlayOpacity,
          background: 'linear-gradient(135deg, transparent 30%, rgba(200,169,81,0.35) 50%, transparent 70%)',
          mixBlendMode: 'overlay',
        }}
      />
    </motion.div>
  );
}

function CardVisual({
  outfit, hasScan, brand, productName, price, dim,
}: {
  outfit: WeeklyOutfit; hasScan: boolean; brand: string; productName: string; price: number; dim?: boolean;
}) {
  return (
    <div className="absolute inset-0 bg-black">
      {outfit.hero_image_url && (
        <img
          src={outfit.hero_image_url}
          alt={productName}
          className={`absolute inset-0 w-full h-full object-cover object-top ${dim ? 'opacity-80' : ''}`}
          loading="lazy"
          draggable={false}
        />
      )}
      {/* Bottom gradient — covers bottom 40% */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{
          height: '40%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 35%, transparent 100%)',
        }}
      />
      {/* Top hairline rule for editorial feel */}
      <div className="absolute top-4 left-4 right-4 h-px bg-white/10" />

      {/* Content over gradient */}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-6 z-10">
        {brand && (
          <p className="text-[10px] tracking-[0.28em] uppercase text-white/55 font-mono mb-2">
            {brand}
          </p>
        )}
        <h3
          className="text-white leading-[1.05] mb-2"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 500,
            fontSize: 'clamp(20px, 5.5vw, 26px)',
            letterSpacing: '0.005em',
          }}
        >
          {productName}
        </h3>
        <div className="flex items-end justify-between gap-3">
          {price > 0 && (
            <span
              className="text-primary"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: '18px',
                letterSpacing: '0.01em',
              }}
            >
              ${(price / 100).toFixed(0)}
            </span>
          )}
          {hasScan ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase bg-primary/15 border border-primary/40 text-primary">
              <ShieldCheck className="h-3 w-3" strokeWidth={2} /> Verified Size
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-[0.16em] uppercase bg-white/[0.06] border border-white/15 text-white/55">
              <Lock className="h-3 w-3" strokeWidth={2} /> Scan to unlock size
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GateCard({ cops, onCTA, onDismiss }: { cops: number; onCTA: () => void; onDismiss: () => void }) {
  return (
    <div className="absolute inset-0 bg-background flex flex-col items-center justify-center text-center px-7 border border-primary/20 rounded-2xl">
      {/* Hairline gold rule top */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 h-px w-12" style={{ background: 'rgba(200,169,81,0.35)' }} />

      <div className="mb-5 opacity-90">
        <DecorativeSilhouette height={80} />
      </div>

      <h3
        className="text-foreground mb-3"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 500,
          fontSize: 'clamp(24px, 6vw, 30px)',
          lineHeight: 1.1,
          letterSpacing: '0.005em',
        }}
      >
        You copped <span className="text-primary italic">{cops}</span> {cops === 1 ? 'piece' : 'pieces'}.
      </h3>

      <p className="text-[14px] text-white/60 max-w-[260px] mb-7 leading-relaxed">
        Want to see how they drape on you?
      </p>

      <button
        onClick={onCTA}
        className="w-full max-w-[260px] bg-primary text-primary-foreground font-bold rounded-full py-3.5 px-6 text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Start Your Scan <ArrowRight className="h-4 w-4" />
      </button>

      <p className="text-[10px] tracking-[0.18em] uppercase font-mono text-white/40 mt-3">
        60 sec · Encrypted · Free
      </p>

      <button
        onClick={onDismiss}
        className="mt-6 text-[11px] tracking-wide text-white/40 hover:text-white/70 transition-colors"
      >
        Keep browsing →
      </button>
    </div>
  );
}

function GateCardPreview({ cops }: { cops: number }) {
  return (
    <div className="absolute inset-0 bg-background flex items-center justify-center border border-primary/15 rounded-2xl">
      <p
        className="text-foreground/60 text-center px-6"
        style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontStyle: 'italic' }}
      >
        {cops} copped…
      </p>
    </div>
  );
}

function EndCard({ cops, drops, onRestart }: { cops: number; drops: number; onRestart: () => void }) {
  return (
    <div className="absolute inset-x-2 top-0 bottom-0 rounded-2xl border border-primary/20 bg-background flex flex-col items-center justify-center text-center px-7">
      <div className="h-px w-12 mb-6" style={{ background: 'rgba(200,169,81,0.35)' }} />
      <h3
        className="text-foreground mb-3"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 500,
          fontSize: 'clamp(24px, 6vw, 30px)',
          lineHeight: 1.1,
        }}
      >
        That's the drop.
      </h3>
      <p className="text-[13px] text-white/55 max-w-[260px] mb-2">
        <span className="text-primary">{cops}</span> copped · <span className="text-white/70">{drops}</span> dropped
      </p>
      <p className="text-[12px] text-white/40 max-w-[260px] mb-7 leading-relaxed">
        Lock in your scan to save these picks and try them on.
      </p>
      <button
        onClick={onRestart}
        className="text-[11px] tracking-[0.18em] uppercase font-mono text-primary/80 hover:text-primary border border-primary/30 rounded-full px-4 py-2"
      >
        Replay Deck
      </button>
    </div>
  );
}

export default WeeklySwipeDeck;
