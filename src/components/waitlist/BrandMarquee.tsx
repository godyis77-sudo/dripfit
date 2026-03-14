import './BrandMarquee.css';

const ROW1 = ['ZARA', 'ASOS', 'SHEIN', 'H&M', 'COS', 'NIKE', 'MANGO'];
const ROW2 = ['OFF-WHITE', 'NIKE', 'STÜSSY', 'SHEIN', 'FEAR OF GOD', 'ASOS', 'AMIRI', 'COS'];
const ROW3 = ['BALENCIAGA', 'MANGO', 'STONE ISLAND', 'H&M', 'BAPE', 'ZARA', 'PALM ANGELS', 'SHEIN'];

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
