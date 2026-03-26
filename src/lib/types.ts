export type FitPreference = 'fitted' | 'slim' | 'regular' | 'relaxed';
export type Confidence = 'high' | 'medium' | 'low';

export interface MeasurementRange {
  min: number;
  max: number;
}

export interface BodyScanResult {
  id: string;
  date: string;
  shoulder: MeasurementRange;
  chest: MeasurementRange;
  bust?: MeasurementRange;
  waist: MeasurementRange;
  hips: MeasurementRange;
  inseam: MeasurementRange;
  sleeve?: MeasurementRange;
  heightCm: number;
  confidence: Confidence;
  recommendedSize: string;
  fitPreference: FitPreference;
  alternatives: { sizeDown: string; sizeUp: string };
  whyLine: string;
}

// Legacy compat for localStorage history
export interface MeasurementResult {
  id: string;
  date: string;
  shoulder: number;
  chest: number;
  waist: number;
  hips: number;
  inseam: number;
  height: number;
  unit: 'in' | 'cm';
  sizeRecommendation: string;
}

export interface PhotoSet {
  front: string | null;
  side: string | null;
}

export type CaptureStep = 'front' | 'side';

export type ReferenceObject = 'credit_card' | 'a4_paper' | 'phone' | 'none';

export const REFERENCE_OBJECTS: Record<ReferenceObject, { label: string; description: string }> = {
  credit_card: { label: 'Credit Card', description: '85.6 × 53.98 mm' },
  a4_paper: { label: 'A4 Paper', description: '210 × 297 mm' },
  phone: { label: 'Phone', description: 'Standard smartphone ~15 cm' },
  none: { label: 'None', description: 'Skip reference object' },
};

export const STEP_CONFIG: Record<CaptureStep, { title: string; instruction: string; tip: string }> = {
  front: {
    title: 'Front View',
    instruction: 'Stand facing the camera in fitted clothing',
    tip: 'Keep feet shoulder-width apart, arms relaxed at sides',
  },
  side: {
    title: 'Side View',
    instruction: 'Turn 90° to the right, keep hands at your sides',
    tip: "Stand naturally, don't suck in your stomach",
  },
};

export const MEASUREMENT_LABELS: Record<string, string> = {
  shoulder: 'Shoulder',
  chest: 'Chest',
  bust: 'Bust',
  waist: 'Waist',
  hips: 'Hips',
  inseam: 'Inseam',
  sleeve: 'Sleeve Length',
  height: 'Height',
};

export const SUPPORTED_RETAILERS = [
  'A Bathing Ape', 'Abercrombie & Fitch', 'Adidas', 'Amazon Fashion', 'ASOS',
  'Balenciaga', 'Banana Republic', 'Boohoo', 'Burberry', 'Corteiz',
  'Dior', 'Essentials', 'Fashion Nova', 'Fear of God', 'Fendi',
  'Forever 21', 'Gap', 'Givenchy', 'Gucci', 'H&M',
  'J.Crew', 'Kith', 'Louis Vuitton', 'Lululemon', 'Mango',
  'Nike', 'Nordstrom', 'Off-White', 'Old Navy', 'Palace',
  'Prada', 'PrettyLittleThing', 'Puma', 'Revolve', 'Saint Laurent',
  'SHEIN', 'Stüssy', 'Supreme', 'Target', 'Topshop',
  'Trapstar', 'Uniqlo', 'Urban Outfitters', 'Versace', 'Zara',
] as const;

export const CALIBRATION_BRANDS = ['Aritzia', 'Gap', 'Levi\'s', 'Nike', 'Zara'] as const;
