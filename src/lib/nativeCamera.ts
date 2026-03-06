import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Returns true when running inside a native Capacitor shell (iOS / Android).
 * On the web preview this returns false, so we fall back to <input type="file">.
 */
export const isNativePlatform = () => Capacitor.isNativePlatform();

export interface NativePhotoResult {
  dataUrl: string;
}

/**
 * Opens the native camera (or gallery) via @capacitor/camera.
 * Only call this when `isNativePlatform()` is true.
 */
export async function takeNativePhoto(source: 'camera' | 'gallery' = 'camera'): Promise<NativePhotoResult> {
  const image = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    width: 1200,
    height: 1600,
    correctOrientation: true,
  });

  if (!image.dataUrl) {
    throw new Error('No image data returned from camera');
  }

  return { dataUrl: image.dataUrl };
}

/**
 * Prompt the user to choose between camera and gallery, then return the photo.
 * Uses the native Capacitor prompt (CameraSource.Prompt) which shows
 * "Take Photo" / "Choose from Gallery" on both iOS and Android.
 */
export async function takeNativePhotoWithPrompt(): Promise<NativePhotoResult> {
  const image = await Camera.getPhoto({
    quality: 85,
    allowEditing: false,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Prompt,
    width: 1200,
    height: 1600,
    correctOrientation: true,
    promptLabelHeader: 'Photo',
    promptLabelPhoto: 'Choose from Gallery',
    promptLabelPicture: 'Take Photo',
  });

  if (!image.dataUrl) {
    throw new Error('No image data returned from camera');
  }

  return { dataUrl: image.dataUrl };
}
