export interface MeasurementResult {
  id: string;
  date: string;
  chest: number;
  waist: number;
  hips: number;
  inseam: number;
  armLength: number;
  shoulderWidth: number;
  neck: number;
  torsoLength: number;
  unit: 'in' | 'cm';
  sizeRecommendation: string;
}

export interface PhotoSet {
  front: string | null;
  side: string | null;
  armsOut: string | null;
}

export type CaptureStep = 'front' | 'side' | 'armsOut';

export const STEP_CONFIG: Record<CaptureStep, { title: string; instruction: string; tip: string }> = {
  front: {
    title: 'Front View',
    instruction: 'Stand facing the camera with ruler held at waist level',
    tip: 'Keep feet shoulder-width apart, arms relaxed at sides',
  },
  side: {
    title: 'Side View',
    instruction: 'Turn 90° to the right. Keep ruler visible',
    tip: 'Stand naturally, don\'t suck in your stomach',
  },
  armsOut: {
    title: 'Arms Extended',
    instruction: 'Face camera with arms straight out to the sides, ruler visible',
    tip: 'Keep arms level with shoulders, palms facing down',
  },
};

export const MEASUREMENT_LABELS: Record<string, string> = {
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  inseam: 'Inseam',
  armLength: 'Arm Length',
  shoulderWidth: 'Shoulder Width',
  neck: 'Neck',
  torsoLength: 'Torso Length',
};
