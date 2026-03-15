import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Loader2, Check, Info, ShoppingBag, Store, Shield, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import BottomTabBar from '@/components/BottomTabBar';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import TryOnUploadSection from '@/components/tryon/TryOnUploadSection';
import TryOnResultSection from '@/components/tryon/TryOnResultSection';
import TryOnPremiumGate from '@/components/tryon/TryOnPremiumGate';
import { CATEGORIES, ALL_PRODUCT_CATEGORIES, FREE_MONTHLY_LIMIT } from '@/components/tryon/tryon-constants';
import { BRAND_GENRES, type BrandGenre } from '@/lib/brandGenres';
import { trackEvent } from '@/lib/analytics';
import { useTryOnState } from '@/hooks/useTryOnState';
import { isGuestMode } from '@/lib/session';
import BrandFilter from '@/components/tryon/BrandFilter';
import { supabase } from '@/integrations/supabase/client';

const SORT_OPTIONS = [
  { key: 'default', label: 'Recommended' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'brand_az', label: 'Brand: A → Z' },
  { key: 'genre', label: 'Genre' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['key'];

/* Retailer autocomplete dropdown */
function RetailerDropdown({ query, onSelect }: { query: string; onSelect: (name: string) => void }) {
  const [results, setResults] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('retailers')
      .select('name')
      .eq('is_active', true)
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(10)
      .then(({ data }) => {
        if (!cancelled && data) setResults(data.map(r => r.name));
      });
    return () => { cancelled = true; };
  }, [query]);

  if (results.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
      {results.map(name => (
        <button key={name} onClick={() => onSelect(name)} className="w-full text-left px-3 py-2 text-[11px] font-medium text-foreground hover:bg-accent/50 transition-colors">
          {name}
        </button>
      ))}
    </div>
  );
}

const TryOn = () => {
  usePageTitle('Virtual Try-On');
  const s = useTryOnState();
  const navigate = useNavigate();
  const isGuest = !s.user && isGuestMode();
  const [guestTryOnNudgeDismissed, setGuestTryOnNudgeDismissed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortKey>('default');
  const [retailerSearch, setRetailerSearch] = useState('');

  const activeFilterCount = (s.selectedBrand ? 1 : 0) + (s.selectedGenre ? 1 : 0) + (s.selectedRetailer ? 1 : 0) + (sort !== 'default' ? 1 : 0) + (s.category !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" onClick={() => s.navigate(-1)} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Try-On</h1>
            <p className="text-[12px] text-muted-foreground">See how it looks before you buy</p>
          </div>
          {s.resultImage && (
            <Button variant="outline" size="sm" onClick={s.handleTryAnother} className="h-8 rounded-lg text-[11px] font-bold gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> New
            </Button>
          )}
        </div>

        {/* Body profile badge */}
        {(s.hasSavedProfile || s.bodyProfile) && !s.resultImage && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3">
            <div>
              <p className="text-[12px] font-bold text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Body Profile Active</p>
              <p className="text-[11px] text-muted-foreground">Your measurements improve try-on accuracy</p>
            </div>
          </div>
        )}

        {!s.resultImage ? (
          <>
            <TryOnUploadSection
              userPhoto={s.userPhoto}
              clothingPhoto={s.clothingPhoto}
              productLink={s.productLink}
              clothingSaved={s.clothingSaved}
              wardrobeItems={s.wardrobeItems}
              showWardrobe={s.showWardrobe}
              user={s.user}
              onUserPhotoChange={s.setUserPhoto}
              onClothingPhotoChange={s.setClothingPhoto}
              onProductLinkChange={s.setProductLink}
              onSaveClothingToWardrobe={s.saveClothingToWardrobe}
              onSelectFromWardrobe={s.selectFromWardrobe}
              onToggleWardrobe={() => s.setShowWardrobe(!s.showWardrobe)}
              onToast={s.toast}
              onRemoveClothing={s.removeClothing}
              onBrowseProducts={s.removeClothing}


            {/* Filters button + dropdown */}
            {!s.clothingPhoto && (
              <>
                <div className="mb-3">
                  <button
                    onClick={() => setFiltersOpen(!filtersOpen)}
                    className={`relative w-full h-11 rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all text-[13px] font-semibold ${
                      activeFilterCount > 0
                        ? 'btn-luxury text-primary-foreground'
                        : 'bg-card border border-border text-foreground/70'
                    }`}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
                  </button>
                </div>

                <AnimatePresence>
                  {filtersOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border border-border rounded-xl bg-card mb-3"
                    >
                      <div className="px-4 py-3 space-y-3">
                        {/* Sort */}
                        <div>
                          <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Sort by</p>
                          <div className="flex flex-wrap gap-1.5">
                            {SORT_OPTIONS.map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => setSort(opt.key)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                  sort === opt.key
                                    ? 'btn-luxury text-primary-foreground'
                                    : 'bg-background border border-border text-foreground/70'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Category */}
                        <div>
                          <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Category</p>
                          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
                            <button
                              onClick={() => s.setCategory('all')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                s.category === 'all'
                                  ? 'btn-luxury text-primary-foreground'
                                  : 'bg-background border border-border text-foreground/70'
                              }`}
                            >
                              🛍️ All
                            </button>
                            {CATEGORIES.map(c => (
                              <button
                                key={c.key}
                                onClick={() => s.setCategory(c.key)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                  s.category === c.key
                                    ? 'btn-luxury text-primary-foreground'
                                    : 'bg-background border border-border text-foreground/70'
                                }`}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Brand search */}
                        <div>
                          <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Brand</p>
                          <BrandFilter
                            gender={s.userGender === 'male' ? 'mens' : s.userGender === 'female' ? 'womens' : null}
                            selectedBrand={s.selectedBrand}
                            onBrandChange={s.setSelectedBrand}
                          />
                        </div>

                        {/* Retailer search */}
                        <div>
                          <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Retailer</p>
                          {s.selectedRetailer ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold btn-luxury text-primary-foreground flex items-center gap-1">
                                {s.selectedRetailer}
                                <button onClick={() => s.setSelectedRetailer(null)} className="ml-0.5"><X className="h-3 w-3" /></button>
                              </span>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type="text"
                                value={retailerSearch}
                                onChange={e => setRetailerSearch(e.target.value)}
                                placeholder="Search retailers…"
                                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                              {retailerSearch.length >= 2 && (
                                <RetailerDropdown query={retailerSearch} onSelect={(r) => { s.setSelectedRetailer(r); setRetailerSearch(''); }} />
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Genre</p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => s.setSelectedGenre(null)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                !s.selectedGenre
                                  ? 'btn-luxury text-primary-foreground'
                                  : 'bg-background border border-border text-foreground/70'
                              }`}
                            >
                              All
                            </button>
                            {BRAND_GENRES.map(genre => (
                              <button
                                key={genre}
                                onClick={() => s.setSelectedGenre(genre === s.selectedGenre ? null : genre)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                                  s.selectedGenre === genre
                                    ? 'btn-luxury text-primary-foreground'
                                    : 'bg-background border border-border text-foreground/70'
                                }`}
                              >
                                {genre}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Clear filters */}
                        {activeFilterCount > 0 && (
                          <button
                            onClick={() => { setSort('default'); s.setSelectedBrand(null); s.setSelectedGenre(null); s.setSelectedRetailer(null); s.setCategory('all'); setRetailerSearch(''); }}
                            className="text-[10px] text-primary font-semibold"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Product catalog browse */}
            {!s.clothingPhoto && (
              <div className="mb-3 space-y-2">
                {s.category === 'all' ? (
                  ALL_PRODUCT_CATEGORIES.map(cat => (
                    <CategoryProductGrid key={cat.key} category={cat.key} title={cat.label} collapsed={true} maxItems={100} gender={s.userGender || undefined} brand={s.selectedBrand || undefined} genre={s.selectedGenre as any} retailer={s.selectedRetailer || undefined} onSelectProduct={s.handleSelectProduct} />
                  ))
                ) : (
                  <CategoryProductGrid category={s.category} title={`Shop ${CATEGORIES.find(c => c.key === s.category)?.label || s.category}`} collapsed={false} maxItems={100} gender={s.userGender || undefined} brand={s.selectedBrand || undefined} genre={s.selectedGenre as any} retailer={s.selectedRetailer || undefined} onSelectProduct={s.handleSelectProduct} />
                )}
              </div>
            )}

            {/* Retailer link for selected Quick Pick */}
            {s.selectedQuickPick?.product_url && (
              <div className="mb-3 p-3 rounded-xl bg-primary/5 border-2 border-primary/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" /> Shop {s.selectedQuickPick.name}
                  </p>
                  <button onClick={s.removeClothing} aria-label="Remove product" className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <a href={s.selectedQuickPick.product_url} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackEvent('quickpick_retailer_clicked', { retailer: s.selectedQuickPick!.retailer, item: s.selectedQuickPick!.name })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-xs font-bold text-primary hover:bg-primary/25 transition-colors active:scale-95"
                >
                  <Store className="h-3.5 w-3.5" /> {s.selectedQuickPick.retailer} — {s.selectedQuickPick.brand}
                </a>
              </div>
            )}

            {s.tryOnError && !s.loading && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-[12px] text-destructive text-center">{s.tryOnError}</p>
                <Button variant="outline" size="sm" className="rounded-lg text-[12px] border-destructive/30 text-destructive hover:bg-destructive/5" onClick={s.handleTryOn}>
                  Try again
                </Button>
              </div>
            )}

            {s.loading && (
              <div className="flex flex-col items-center mt-3 mb-1 gap-2">
                <p className="text-[12px] text-muted-foreground font-medium">
                  {s.loadingStepIndex === 0 && 'Analyzing your body scan…'}
                  {s.loadingStepIndex === 1 && 'Compositing the outfit…'}
                  {s.loadingStepIndex === 2 && 'Finalizing your preview…'}
                </p>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${i <= s.loadingStepIndex ? 'bg-primary' : 'border border-muted-foreground/40'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {!s.canGenerate && !s.loading && (
              <p className="text-[12px] text-muted-foreground text-center mt-1.5 mb-1">
                {!s.userPhoto && !s.clothingPhoto ? 'Upload your photo and a clothing item to start' : !s.userPhoto ? 'Upload your photo to continue' : 'Upload a clothing item to continue'}
              </p>
            )}
            {s.canGenerate && !s.loading && (
              <p className="text-[12px] text-primary font-semibold text-center mt-1.5 mb-1 flex items-center justify-center gap-1">
                <Check className="h-3 w-3" /> Ready to generate
              </p>
            )}

            <div className="flex items-start gap-1.5 bg-card border border-border rounded-lg px-3 py-2 mt-2 mb-3">
              <Info className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
              <p className="text-[12px] text-muted-foreground leading-relaxed">AI preview — actual fit, drape, and texture may vary. Use your Scan profile for the most accurate sizing.</p>
            </div>

            {/* Generate CTA — only show when user has at least one photo */}
            {(s.userPhoto || s.clothingPhoto) && !s.loading && (
              <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 -mx-4 px-4 py-3 bg-gradient-to-t from-background via-background to-background/0">
                <Button className="w-full h-12 min-h-[44px] rounded-lg text-sm font-bold btn-luxury text-primary-foreground active:scale-[0.97] transition-transform shadow-lg disabled:opacity-30" onClick={s.handleTryOn} disabled={!s.canGenerate}>
                  <Sparkles className="mr-2 h-4 w-4" /> Generate Try-On
                </Button>
              </div>
            )}
            {(s.userPhoto || s.clothingPhoto) && s.loading && createPortal(
              <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-[120] px-4 animate-in slide-in-from-bottom-8 duration-300">
                <div className="mx-auto w-full max-w-[390px]">
                  <div className="glass-card border border-primary/20 rounded-2xl px-4 py-3 shadow-[0_-4px_30px_-8px_hsl(var(--primary)/0.25)] backdrop-blur-xl">
                    <Button className="w-full h-11 min-h-[44px] rounded-xl text-sm font-bold btn-luxury text-primary-foreground opacity-100 animate-pulse" disabled>
                      <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" /> Generating Try-On…
                    </Button>
                    <div className="flex flex-col items-center mt-2 gap-1">
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {s.loadingStepIndex === 0 && 'Analyzing your body scan…'}
                        {s.loadingStepIndex === 1 && 'Compositing the outfit…'}
                        {s.loadingStepIndex === 2 && 'Finalizing your preview…'}
                      </p>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => (
                          <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${i <= s.loadingStepIndex ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]' : 'bg-muted-foreground/20'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </>
        ) : (
          <>
            {/* Guest sign-up nudge after try-on result */}
            {isGuest && s.resultImage && !guestTryOnNudgeDismissed && (
              <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-4 relative">
                <button
                  onClick={() => setGuestTryOnNudgeDismissed(true)}
                  className="absolute top-2 right-2 text-muted-foreground text-xs"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
                <p className="text-sm font-bold text-foreground mb-1">Like what you see?</p>
                <p className="text-[12px] text-muted-foreground mb-3">Sign up to save this try-on, build your wardrobe, and get unlimited access.</p>
                <div className="flex gap-2">
                  <Button size="sm" className="btn-luxury text-[12px]" onClick={() => navigate('/auth')}>
                    Sign Up Free
                  </Button>
                  <Button size="sm" variant="outline" className="text-[12px]" onClick={() => setGuestTryOnNudgeDismissed(true)}>
                    Keep Exploring
                  </Button>
                </div>
              </div>
            )}
            <TryOnResultSection
              resultImage={s.resultImage}
              clothingPhoto={s.clothingPhoto}
              category={s.category}
              productLink={s.productLink}
              selectedQuickPick={s.selectedQuickPick}
              lookItems={s.lookItems}
              showLookItems={s.showLookItems}
              user={s.user}
              isPublic={s.isPublic}
              caption={s.caption}
              shared={s.shared}
              showPostUI={s.showPostUI}
              showSuccessOverlay={s.showSuccessOverlay}
              savedToItems={s.savedToItems}
              layerHistory={s.layerHistory}
              userGender={s.userGender}
              hasUnlimitedTryOns={s.hasUnlimitedTryOns}
              addingAccessory={s.addingAccessory}
              onSetCaption={s.setCaption}
              onSetIsPublic={s.setIsPublic}
              onSetShowPostUI={s.setShowPostUI}
              onShare={isGuest ? () => navigate('/auth') : s.handleShare}
              onTryAnother={s.handleTryAnother}
              onSaveToItems={isGuest ? () => navigate('/auth') : s.handleSaveToItems}
              onAddAccessory={s.handleAddAccessory}
              onSetLookItems={s.setLookItems}
              onToast={s.toast}
            />
          </>
        )}

        {s.description && !s.resultImage && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[13px] text-foreground/80">{s.description}</p>
          </div>
        )}

        <p className="text-[11px] text-foreground/40 text-center flex items-center justify-center gap-1 mt-3 mb-2">
          <Shield className="h-3 w-3" /> Private by default · delete anytime
        </p>

        {!s.resultImage && !s.hasUnlimitedTryOns && s.remainingTryOns <= FREE_MONTHLY_LIMIT && (
          <p className="text-[12px] text-foreground/40 text-center mb-2">
            {s.remainingTryOns} free try-on{s.remainingTryOns !== 1 ? 's' : ''} left this month
          </p>
        )}
      </div>

      {s.showPremiumGate && <TryOnPremiumGate onClose={() => s.setShowPremiumGate(false)} />}
      <BottomTabBar />
    </div>
  );
};

export default TryOn;
