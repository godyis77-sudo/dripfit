import { Store } from 'lucide-react';

const PARTNER_SLOTS = [
  { retailer: 'Zara', note: 'Runs slim in tops — size up if between sizes', tag: 'Recommended' },
  { retailer: 'H&M', note: 'True to size across most categories', tag: 'Recommended' },
];

const BrandPartnerCards = () => (
  <div className="mt-4 space-y-2">
    <p className="section-label">Featured Brand Sizing Notes</p>
    {PARTNER_SLOTS.map(p => (
      <div key={p.retailer} className="bg-card border border-border rounded-xl p-3 flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Store className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[12px] font-bold text-foreground">{p.retailer}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-wider">{p.tag}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{p.note}</p>
        </div>
      </div>
    ))}
    <p className="text-[8px] text-muted-foreground/40 text-center">Sizing notes are independent of any sponsorship and do not affect recommendations.</p>
  </div>
);

export default BrandPartnerCards;
