import './BrandMarquee.css';

const ROW1 = [
  'GUCCI', 'NIKE', 'ZARA', 'BALENCIAGA', 'OFF-WHITE', 'VERSACE',
  'PRADA', 'RALPH LAUREN', 'BURBERRY', 'DIOR', 'GIVENCHY', 'FENDI',
  'STÜSSY', 'STONE ISLAND', 'MONCLER', 'VALENTINO',
];

const ROW2 = [
  'LOUIS VUITTON', 'ADIDAS', 'H&M', 'ASOS', 'COS', 'UNIQLO',
  'MANGO', 'TOMMY HILFIGER', 'SHEIN', 'FEAR OF GOD', 'CELINE',
  'HUGO BOSS', 'LOEWE', 'ACNE STUDIOS', 'AMIRI', 'BALMAIN',
];

function MarqueeRow({ brands, reverse }: { brands: string[]; reverse?: boolean }) {
  return (
    <div className="marquee-track">
      <div className={`marquee-scroll ${reverse ? 'marquee-reverse' : ''}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee-set" aria-hidden={copy === 1}>
            {brands.map((b) => (
              <span key={`${b}-${copy}`} className="marquee-brand">
                {b}
                <span className="marquee-dot" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BrandMarquee() {
  return (
    <div className="marquee-wrapper">
      <MarqueeRow brands={ROW1} />
      <MarqueeRow brands={ROW2} reverse />
    </div>
  );
}
