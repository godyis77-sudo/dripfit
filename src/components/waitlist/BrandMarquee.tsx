import './BrandMarquee.css';

const ROW1 = ['GUCCI', 'BALENCIAGA', 'VERSACE', 'PRADA', 'DIOR', 'GIVENCHY', 'FENDI', 'VALENTINO', 'MONCLER', 'BALMAIN'];
const ROW2 = ['NIKE', 'ZARA', 'OFF-WHITE', 'RALPH LAUREN', 'BURBERRY', 'STONE ISLAND', 'STÜSSY', 'AMIRI', 'LOEWE', 'CELINE'];
const ROW3 = ['LOUIS VUITTON', 'ADIDAS', 'H&M', 'ASOS', 'COS', 'UNIQLO', 'MANGO', 'TOMMY HILFIGER', 'SHEIN', 'HUGO BOSS', 'FEAR OF GOD', 'ACNE STUDIOS'];

function MarqueeRow({ brands, reverse, depth }: { brands: string[]; reverse?: boolean; depth: 'front' | 'mid' | 'back' }) {
  return (
    <div className={`marquee-track marquee-depth-${depth}`}>
      <div className={`marquee-scroll ${reverse ? 'marquee-reverse' : ''} marquee-speed-${depth}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee-set" aria-hidden={copy === 1}>
            {brands.map((b) => (
              <span key={`${b}-${copy}`} className={`marquee-brand marquee-brand-${depth}`}>
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
      <MarqueeRow brands={ROW3} depth="back" />
      <MarqueeRow brands={ROW1} depth="front" />
      <MarqueeRow brands={ROW2} depth="back" reverse />
    </div>
  );
}
