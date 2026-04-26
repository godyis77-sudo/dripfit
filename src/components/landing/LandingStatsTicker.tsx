const TICKER_ITEMS = [
  'APPAREL RETURN RATE: 25–40%',
  '70% OF RETURNS ARE FIT-RELATED',
  '47% OF SHOPPERS AVOID ONLINE FASHION DUE TO FIT UNCERTAINTY',
  '$849.9B IN RETURNS PROCESSED IN 2025',
  '$46 AVERAGE COST PER RETURNED ITEM',
  '1 IN 4 ORDERS INCLUDES A BRACKETED SIZE',
];

export default function LandingStatsTicker() {
  return (
    <>
      <div
        className="relative overflow-hidden select-none pointer-events-none bg-primary/[0.08] border-y border-primary/30"
        aria-hidden="true"
        style={{ height: 42 }}
      >
        <div className="flex items-center h-full animate-ticker whitespace-nowrap">
          {[0, 1].map((dup) => (
            <span key={dup} className="flex items-center gap-0 shrink-0">
              {TICKER_ITEMS.map((t) => (
                <span key={t} className="type-data px-6 text-primary">
                  {t}
                  <span className="ml-6 opacity-50">·</span>
                </span>
              ))}
              <span className="type-data font-bold px-6 text-primary">
                DRIPFIT ENDS THE GUESSWORK <span className="text-primary font-extrabold">✓</span>
                <span className="ml-6 opacity-50">·</span>
              </span>
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only">
        Apparel return rate: 25–40%. 70% of returns are fit-related. 47% of shoppers avoid online fashion due to fit uncertainty. $849.9B in returns processed in 2025. $46 average cost per returned item. 1 in 4 orders includes a bracketed size.
      </p>
    </>
  );
}
