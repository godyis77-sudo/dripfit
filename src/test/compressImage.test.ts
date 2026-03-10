import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressImage } from '@/components/tryon/tryon-constants';

describe('compressImage', () => {
  let mockCanvas: any;
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = { drawImage: vi.fn() };
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,result'),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as any;
      return document.createElement(tag);
    });

    // Mock URL.createObjectURL / revokeObjectURL
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('should return a compressed data URL', async () => {
    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 800;
      height = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await compressImage(file, 1200, 0.8);

    expect(result).toBe('data:image/jpeg;base64,result');
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    globalThis.Image = originalImage;
  });

  it('should scale down images exceeding maxDim', async () => {
    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 3000;
      height = 2000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    await compressImage(file, 600, 0.8);

    // scale = 600/3000 = 0.2 → 600x400
    expect(mockCanvas.width).toBe(600);
    expect(mockCanvas.height).toBe(400);

    globalThis.Image = originalImage;
  });

  it('should not upscale small images', async () => {
    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 400;
      height = 300;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;

    const file = new File(['test'], 'small.jpg', { type: 'image/jpeg' });
    await compressImage(file, 1200, 0.8);

    // Neither dimension exceeds 1200, no scaling
    expect(mockCanvas.width).toBe(400);
    expect(mockCanvas.height).toBe(300);

    globalThis.Image = originalImage;
  });

  it('should reject on image load error', async () => {
    const originalImage = globalThis.Image;
    globalThis.Image = class MockImage {
      width = 0;
      height = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => this.onerror?.(), 0);
      }
    } as any;

    const file = new File(['test'], 'bad.jpg', { type: 'image/jpeg' });
    await expect(compressImage(file)).rejects.toThrow('Failed to load image');

    globalThis.Image = originalImage;
  });
});
