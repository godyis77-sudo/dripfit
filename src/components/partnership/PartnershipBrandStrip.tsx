import { useCatalogStats } from '@/hooks/useCatalogStats';

const BRANDS = [
  'NIKE', 'ADIDAS', 'ZARA', 'H&M', 'ARC\u2019TERYX', 'STONE ISLAND',
  'AMI PARIS', 'ARITZIA', 'COS', 'NEW BALANCE', 'CARHARTT', 'UNIQLO',
];

export default function PartnershipBrandStrip() {
  const stats = useCatalogStats();
  return (
    <section className="border-b border-border bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 text-center mb-5">
          Size data indexed from {stats.brands}+ brands including
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {BRANDS.map((b) => (
            <span
              key={b}
              className="font-display text-sm sm:text-base tracking-[0.18em] uppercase text-foreground/45 whitespace-nowrap"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
