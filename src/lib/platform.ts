import { Capacitor } from '@capacitor/core';

/** True when running inside the native iOS shell */
export const isNativeIOS = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

/** True when running inside any native shell (iOS or Android) */
export const isNative = (): boolean => Capacitor.isNativePlatform();

/** True when running inside the native Android shell */
export const isNativeAndroid = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
