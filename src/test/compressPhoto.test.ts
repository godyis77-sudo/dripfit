import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressPhoto } from '@/lib/imageUtils';

// Mock canvas and image in jsdom
describe('compressPhoto', () => {
  let mockCanvas: any;
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      drawImage: vi.fn(),
    };
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,compressed'),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as any;
      return document.createElement(tag);
    });
  });

  it('should resolve with a data URL string', async () => {
    // Create a tiny valid 1x1 PNG data URL
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // We need to mock Image since jsdom doesn't fully support it
    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 200;
      height = 400;
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        // Simulate async load
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;

    const result = await compressPhoto(tinyPng, 1024, 0.85);

    expect(result).toBe('data:image/jpeg;base64,compressed');
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85);

    globalThis.Image = originalImage;
  });

  it('should scale down images larger than maxPx', async () => {
    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 4000;
      height = 3000;
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;

    await compressPhoto('data:image/png;base64,test', 800, 0.7);

    // 4000 is the max dimension, scale = 800/4000 = 0.2
    // width = round(4000 * 0.2) = 800, height = round(3000 * 0.2) = 600
    expect(mockCanvas.width).toBe(800);
    expect(mockCanvas.height).toBe(600);
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.7);

    globalThis.Image = originalImage;
  });

  it('should not upscale images smaller than maxPx', async () => {
    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 500;
      height = 300;
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;

    await compressPhoto('data:image/png;base64,test', 1024, 0.85);

    // scale = min(1, 1024/500) = 1 — no scaling
    expect(mockCanvas.width).toBe(500);
    expect(mockCanvas.height).toBe(300);

    globalThis.Image = originalImage;
  });

  it('should reject on image load error', async () => {
    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 0;
      height = 0;
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onerror?.(), 0);
      }
    } as any;

    await expect(compressPhoto('data:image/png;base64,bad', 1024)).rejects.toThrow('Image load failed');

    globalThis.Image = originalImage;
  });

  it('should reject when canvas context is null', async () => {
    mockCanvas.getContext = vi.fn(() => null);

    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 100;
      height = 100;
      crossOrigin = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;

    await expect(compressPhoto('data:image/png;base64,test')).rejects.toThrow('Canvas not available');

    globalThis.Image = originalImage;
  });
});
