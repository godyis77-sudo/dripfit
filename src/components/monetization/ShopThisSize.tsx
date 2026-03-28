import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Link2, ShoppingBag, Bookmark, Check, Store } from 'lucide-react';
import SaveBanner from '@/components/ui/save-banner';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';

import { SUPPORTED_RETAILERS } from '@/lib/types';

interface ShopThisSizeProps {
  recommendedSize: string;
  confidence: string;
  retailer?: string;
  category?: string;
}

const RETAILER_URLS: Record<string, string> = {
  SHEIN: 'https://shein.com',
  Zara: 'https://zara.com',
  'H&M': 'https://hm.com',
  Gap: 'https://gap.com',
  Nordstrom: 'https://nordstrom.com',
  Lululemon: 'https://lululemon.com',
  Macys: 'https://macys.com',
  JCPenney: 'https://jcpenney.com',
  Aritzia: 'https://aritzia.com',
  Simons: 'https://simons.ca',
};

// Map retailer display names to brand_slug values used in size_recommendations_cache
const RETAILER_SLUG_MAP: Record<string, string> = {
  SHEIN: 'shein',
  Zara: 'zara',
  'H&M': 'hm',
  Gap: 'gap',
  Nordstrom: 'nordstrom',
  Lululemon: 'lululemon',
  Macys: 'macys',
  JCPenney: 'jcpenney',
  Aritzia: 'aritzia',
  Simons: 'simons',
};

function extractRetailer(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [name] of Object.entries(RETAILER_URLS)) {
      if (hostname.includes(name.toLowerCase().replace(/[^a-z]/g, ''))) return name;
    }
  } catch { /* ignore */ }
  return null;
}

interface BrandSizeRec {
  brand_slug: string;
  recommended_size: string;
  confidence: number;
}

const ShopThisSize = ({ recommendedSize, confidence, retailer, category }: ShopThisSizeProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [productLink, setProductLink] = useState('');
  const [matchedRetailer, setMatchedRetailer] = useState<string | null>(null);
  const [showRetailers, setShowRetailers] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const [brandSizes, setBrandSizes] = useState<Record<string, BrandSizeRec>>({});

  // Fetch per-brand size recommendations
  useEffect(() => {
    if (!user) return;
    supabase
      .from('size_recommendations_cache')
      .select('brand_slug, recommended_size, confidence')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, BrandSizeRec> = {};
        for (const r of data) {
          // Keep highest confidence per brand
          if (!map[r.brand_slug] || r.confidence > map[r.brand_slug].confidence) {
            map[r.brand_slug] = r as BrandSizeRec;
          }
        }
        setBrandSizes(map);
      });
  }, [user]);

  const getBrandSize = (retailerName: string): string | null => {
    const slug = RETAILER_SLUG_MAP[retailerName];
    if (!slug) return null;
    return brandSizes[slug]?.recommended_size || null;
  };

  const extraProps = useMemo(() => ({
    size: recommendedSize,
    source: 'results',
    confidence,
    category: category || 'general',
  }), [recommendedSize, confidence, category]);

  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } =
    useAffiliateClickout({ extraProps });

  const handleLinkPaste = (value: string) => {
    setProductLink(value);
    if (value.length > 10) {
      const found = extractRetailer(value);
      setMatchedRetailer(found);
      if (found) trackEvent('product_link_pasted', { retailer: found });
    } else {
      setMatchedRetailer(null);
    }
  };

  const handleSaveForLater = async () => {
    const targetRetailer = matchedRetailer || retailer || '';
    try {
      if (!user) { toast({ title: 'Sign in to save items' }); return; }
      await supabase.from('saved_items').insert({
        user_id: user.id,
        session_id: null,
        product_link: productLink || null,
        retailer: targetRetailer,
        brand: targetRetailer,
        category: category || null,
        size_recommendation: recommendedSize,
        confidence,
      });
      setSaved(true);
      setShowSavedConfirmation(true);
      trackEvent('saved_item_added', { retailer: targetRetailer });
    } catch {
      toast({ title: 'Could not save', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3 mt-4">
      {/* Primary CTA */}
      {productLink && matchedRetailer ? (
        <Button
          className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
          onClick={() => beginClickout(matchedRetailer, productLink)}
        >
          <ShoppingBag className="mr-2 h-4 w-4" /> Shop My Size
        </Button>
      ) : (
        <Button
          className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
          onClick={() => setShowRetailers(!showRetailers)}
        >
          <ShoppingBag className="mr-2 h-4 w-4" /> Shop My Size
        </Button>
      )}

      {/* Retailer grid */}
      {showRetailers && !productLink && (
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Choose retailer</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SUPPORTED_RETAILERS.map(r => {
              const brandSize = getBrandSize(r);
              return (
                <button
                  key={r}
                  onClick={() => beginClickout(r, RETAILER_URLS[r] || '#')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/30 active:scale-[0.97] transition-all text-left"
                >
                  <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-medium text-foreground block truncate">{r}</span>
                    {brandSize && (
                      <span className="text-[10px] font-bold text-primary">Size {brandSize}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Save confirmation banner */}
      <SaveBanner
        visible={showSavedConfirmation}
        onDismiss={useCallback(() => setShowSavedConfirmation(false), [])}
        navigateTo="/profile/saved"
        label="Saved successfully"
        subtext="View in Profile > Saved Items"
      />

      {/* Confirmation sheet */}
      {pendingClickout && (
        <div className="bg-card border border-primary/20 rounded-xl p-3 space-y-2">
          <p className="text-[12px] font-bold text-foreground">
            You're leaving the app to visit {pendingClickout.retailer}.
          </p>
          <p className="text-[10px] text-muted-foreground">
            Some links may earn us a commission.
          </p>
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
            <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[12px] font-bold text-primary">
                Recommended size: {getBrandSize(pendingClickout.retailer) || recommendedSize}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">{confidence} confidence · {category || 'general'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 h-9 rounded-lg btn-luxury text-primary-foreground text-[11px] font-bold" onClick={confirmClickout}>
              <ExternalLink className="mr-1 h-3 w-3" /> Continue to Store
            </Button>
            <Button variant="outline" className="h-9 rounded-lg text-[11px]" onClick={cancelClickout}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Commission disclosure */}
      <p className="text-[11px] text-muted-foreground/60 text-center">
        We may earn a commission. It doesn't change your price.
      </p>
    </div>
  );
};

export default ShopThisSize;
