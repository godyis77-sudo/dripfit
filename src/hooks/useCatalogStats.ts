import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CatalogStats {
  products: number;
  brands: number;
  retailers: number;
  sizeCharts: number;
  categories: number;
  /** Pre-formatted display strings */
  productsLabel: string;
  brandsLabel: string;
  retailersLabel: string;
  sizeChartsLabel: string;
  categoriesLabel: string;
}

// Fallback values (last known good — refreshed from app_config on mount)
const FALLBACK: CatalogStats = {
  products: 8504,
  brands: 142,
  retailers: 162,
  sizeCharts: 390,
  categories: 36,
  productsLabel: '8,500+',
  brandsLabel: '142',
  retailersLabel: '162',
  sizeChartsLabel: '390',
  categoriesLabel: '36',
};

const KEYS = [
  'catalog_product_count',
  'catalog_brand_count',
  'catalog_retailer_count',
  'catalog_size_chart_count',
  'catalog_category_count',
] as const;

let cached: CatalogStats | null = null;
let inflight: Promise<CatalogStats> | null = null;

function roundDownToNearest(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function formatProducts(n: number): string {
  if (n >= 1000) {
    const rounded = roundDownToNearest(n, 500);
    return `${rounded.toLocaleString('en-US')}+`;
  }
  return n.toLocaleString('en-US');
}

function build(map: Record<string, number>): CatalogStats {
  const products = map.catalog_product_count ?? FALLBACK.products;
  const brands = map.catalog_brand_count ?? FALLBACK.brands;
  const retailers = map.catalog_retailer_count ?? FALLBACK.retailers;
  const sizeCharts = map.catalog_size_chart_count ?? FALLBACK.sizeCharts;
  const categories = map.catalog_category_count ?? FALLBACK.categories;
  return {
    products,
    brands,
    retailers,
    sizeCharts,
    categories,
    productsLabel: formatProducts(products),
    brandsLabel: brands.toString(),
    retailersLabel: retailers.toString(),
    sizeChartsLabel: sizeCharts.toString(),
    categoriesLabel: categories.toString(),
  };
}

async function fetchStats(): Promise<CatalogStats> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from('app_config')
        .select('key, value')
        .in('key', KEYS as unknown as string[]);
      const map: Record<string, number> = {};
      (data ?? []).forEach((row: any) => {
        const n = parseInt(row.value, 10);
        if (!Number.isNaN(n)) map[row.key] = n;
      });
      cached = build(map);
      return cached;
    } catch {
      cached = FALLBACK;
      return cached;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useCatalogStats(): CatalogStats {
  const [stats, setStats] = useState<CatalogStats>(cached ?? FALLBACK);
  useEffect(() => {
    let mounted = true;
    fetchStats().then((s) => {
      if (mounted) setStats(s);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return stats;
}
