import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { ConfidenceDot } from '@/components/ui/confidence-dot';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const BRAND_SLUG_MAP: Record<string, string> = {
  'Zara': 'zara',
  'H&M': 'hm',
  'Uniqlo': 'uniqlo',
  'Nike': 'nike',
  'Adidas': 'adidas',
  'ASOS': 'asos',
  'Gap': 'gap',
  'Lululemon': 'lululemon',
  'SHEIN': 'shein',
  'Fashion Nova': 'fashionnova',
  'Abercrombie & Fitch': 'abercrombie',
};

interface SizeRec {
  recommended_size: string;
  second_option: string | null;
  fit_status: string;
  confidence: number;
  fit_notes: string | null;
}

interface ShopSizeInfoProps {
  retailerName: string;
  userId: string | undefined;
  hasScan: boolean;
}

export function ShopSizeInfo({ retailerName, userId, hasScan }: ShopSizeInfoProps) {
  const [rec, setRec] = useState<SizeRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const slug = BRAND_SLUG_MAP[retailerName];

  useEffect(() => {
    if (!slug || !userId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('size_recommendations_cache')
      .select('recommended_size, second_option, fit_status, confidence, fit_notes')
      .eq('user_id', userId)
      .eq('brand_slug', slug)
      .eq('category', 'tops')
      .gt('expires_at', new Date().toISOString())
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setRec(data[0] as SizeRec);
        setLoading(false);
      });
  }, [slug, userId]);

  if (!slug) {
    return <p className="text-[11px] font-bold text-muted-foreground">—</p>;
  }

  if (loading) {
    return (
      <div
        className="h-4 w-10 rounded-md"
        style={{
          background: 'linear-gradient(110deg, #1A1A1A 30%, #272727 50%, #1A1A1A 70%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
        }}
      />
    );
  }

  if (!userId || !hasScan) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[11px] font-bold text-muted-foreground cursor-help">?</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[11px]">
            Complete a scan to see your size
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!rec) {
    return <p className="text-[11px] font-bold text-muted-foreground">—</p>;
  }

  const sizeLabel = rec.second_option
    ? `${rec.recommended_size}–${rec.second_option}`
    : rec.recommended_size;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setSheetOpen(true); }}
        className="flex items-center gap-1 active:scale-95 transition-transform"
      >
        <ConfidenceDot confidence={rec.confidence} />
        <span className="text-[13px] font-bold text-primary">{sizeLabel}</span>
      </button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[50vh]">
          <SheetHeader>
            <SheetTitle className="text-left">{retailerName} · Tops</SheetTitle>
          </SheetHeader>
          <div className="px-6 py-4 space-y-4">
            <p className="text-[32px] font-bold text-primary">{sizeLabel}</p>
            <ConfidenceBar confidence={rec.confidence} showLabel />
            {rec.fit_notes && (
              <p className="text-[13px] text-muted-foreground leading-relaxed">{rec.fit_notes}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
