/**
 * Cross-platform haptic feedback utility.
 * Uses Capacitor Haptics when available, falls back to vibration API.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const VIBRATION_MAP: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 40, 20],
  error: [30, 50, 30, 50, 30],
};

export function hapticFeedback(style: HapticStyle = 'light') {
  try {
    // Use navigator.vibrate as lightweight haptic fallback
    if ('vibrate' in navigator) {
      navigator.vibrate(VIBRATION_MAP[style]);
    }
  } catch {
    // Silently fail — haptics are enhancement only
  }
}
