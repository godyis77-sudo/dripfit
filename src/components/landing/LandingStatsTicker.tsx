const TICKER_ITEMS = [
  '70% OF RETURNS ARE FIT-RELATED',
  '$46 AVERAGE COST PER RETURNED ITEM',
  '94% FIRST-TRY FIT RATE WITH DRIPFIT',
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
        70% of returns are fit-related. $46 average cost per returned item. 94% first-try fit rate with DripFit.
      </p>
    </>
  );
}
