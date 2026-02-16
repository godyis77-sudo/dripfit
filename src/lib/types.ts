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

export type CalibrationObject = 'ruler' | 'loonie' | 'quarter' | 'five_dollar_bill';

export const CALIBRATION_OBJECTS: Record<CalibrationObject, { label: string; description: string; knownSize: string }> = {
  ruler: {
    label: 'Ruler',
    description: 'Standard 12″ ruler',
    knownSize: '12 inches long',
  },
  loonie: {
    label: 'Loonie (CAD $1)',
    description: '26.5 mm diameter coin',
    knownSize: '26.5 mm (1.043 inches) diameter',
  },
  quarter: {
    label: 'Quarter (US 25¢)',
    description: '24.26 mm diameter coin',
    knownSize: '24.26 mm (0.955 inches) diameter',
  },
  five_dollar_bill: {
    label: '$5 Bill (CAD)',
    description: '152.4 × 69.85 mm',
    knownSize: '152.4 mm (6 inches) long × 69.85 mm (2.75 inches) tall',
  },
};

export const getStepConfig = (object: CalibrationObject): Record<CaptureStep, { title: string; instruction: string; tip: string }> => {
  const objLabel = CALIBRATION_OBJECTS[object].label;
  return {
    front: {
      title: 'Front View',
      instruction: `Stand facing the camera with ${objLabel} held at waist level`,
      tip: 'Keep feet shoulder-width apart, arms relaxed at sides',
    },
    side: {
      title: 'Side View',
      instruction: `Turn 90° to the right. Keep ${objLabel} visible`,
      tip: "Stand naturally, don't suck in your stomach",
    },
    armsOut: {
      title: 'Arms Extended',
      instruction: `Face camera with arms straight out to the sides, ${objLabel} visible`,
      tip: 'Keep arms level with shoulders, palms facing down',
    },
  };
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
