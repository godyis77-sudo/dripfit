import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Link2, ShoppingBag, Bookmark, Check, Store } from 'lucide-react';
import SaveBanner from '@/components/ui/save-banner';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

function extractRetailer(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [name] of Object.entries(RETAILER_URLS)) {
      if (hostname.includes(name.toLowerCase().replace(/[^a-z]/g, ''))) return name;
    }
  } catch { /* ignore */ }
  return null;
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
  const [showConfirmation, setShowConfirmation] = useState<{ retailer: string; url: string } | null>(null);

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

  const handleShopClickout = (selectedRetailer: string, url: string) => {
    setShowConfirmation({ retailer: selectedRetailer, url });
  };

  const confirmClickout = () => {
    if (!showConfirmation) return;
    trackEvent('shop_clickout', { retailer: showConfirmation.retailer, size: recommendedSize, source: 'results', confidence, category: category || 'general', hasLink: !!productLink });
    window.open(showConfirmation.url, '_blank', 'noopener');
    setShowConfirmation(null);
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
      // No toast — SaveBanner handles confirmation
    } catch {
      toast({ title: 'Could not save', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3 mt-4">
      {/* Product link input */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Link2 className="h-3 w-3 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground font-medium">Paste product link</p>
        </div>
        <Input
          placeholder="https://zara.com/product/..."
          value={productLink}
          onChange={e => handleLinkPaste(e.target.value)}
          className="rounded-lg h-9 text-[12px]"
        />
        {matchedRetailer && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold flex items-center gap-1">
              <Store className="h-3 w-3" /> Matched: {matchedRetailer}
            </span>
            <span className="text-[9px] text-muted-foreground">We'll recommend the best size for this item.</span>
          </div>
        )}
      </div>

      {/* Primary CTA */}
      {productLink && matchedRetailer ? (
        <Button
          className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
          onClick={() => handleShopClickout(matchedRetailer, productLink)}
        >
          <ShoppingBag className="mr-2 h-4 w-4" /> Shop This Size — {recommendedSize}
        </Button>
      ) : (
        <Button
          className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold"
          onClick={() => setShowRetailers(!showRetailers)}
        >
          <ShoppingBag className="mr-2 h-4 w-4" /> Shop This Size — {recommendedSize}
        </Button>
      )}

      {/* Retailer grid */}
      {showRetailers && !productLink && (
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Choose retailer</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SUPPORTED_RETAILERS.map(r => (
              <button
                key={r}
                onClick={() => handleShopClickout(r, RETAILER_URLS[r] || '#')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/30 active:scale-[0.97] transition-all text-left"
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[11px] font-medium text-foreground">{r}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save for later */}
      <Button
        variant="outline"
        className="w-full h-9 rounded-lg text-[11px] font-bold"
        onClick={handleSaveForLater}
        disabled={saved}
      >
        {saved ? (
          <><Check className="mr-1.5 h-3.5 w-3.5" /> Saved</>
        ) : (
          <><Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save for Later</>
        )}
      </Button>

      {/* Save confirmation banner */}
      <SaveBanner
        visible={showSavedConfirmation}
        onDismiss={useCallback(() => setShowSavedConfirmation(false), [])}
        navigateTo="/profile/saved"
        label="Saved successfully"
        subtext="View in Profile > Saved Items"
      />

      {/* Confirmation sheet */}
      {showConfirmation && (
        <div className="bg-card border border-primary/20 rounded-xl p-3 space-y-2">
          <p className="text-[12px] font-bold text-foreground">Opening {showConfirmation.retailer}</p>
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
            <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[12px] font-bold text-primary">Recommended size: {recommendedSize}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{confidence} confidence · {category || 'general'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 h-9 rounded-lg btn-luxury text-primary-foreground text-[11px] font-bold" onClick={confirmClickout}>
              <ExternalLink className="mr-1 h-3 w-3" /> Continue to Store
            </Button>
            <Button variant="outline" className="h-9 rounded-lg text-[11px]" onClick={() => setShowConfirmation(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Commission disclosure */}
      <p className="text-[9px] text-muted-foreground/60 text-center">
        We may earn a commission. It doesn't change your price.
      </p>
    </div>
  );
};

export default ShopThisSize;
