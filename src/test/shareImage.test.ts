import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShareImage } from '@/lib/shareImage';
import type { MeasurementRange } from '@/lib/types';

describe('generateShareImage', () => {
  let mockCtx: Record<string, any>;
  let mockCanvas: any;
  const fakeBlob = new Blob(['test'], { type: 'image/png' });

  beforeEach(() => {
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      textAlign: '',
      font: '',
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      quadraticCurveTo: vi.fn(),
      setLineDash: vi.fn(),
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toBlob: vi.fn((cb: (blob: Blob) => void) => cb(fakeBlob)),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as any;
      return document.createElement(tag);
    });

    // Mock document.fonts.load
    Object.defineProperty(document, 'fonts', {
      value: { load: vi.fn().mockResolvedValue([]) },
      writable: true,
      configurable: true,
    });
  });

  const sampleData = {
    measurements: {
      shoulder: { min: 42, max: 46 } as MeasurementRange,
      chest: { min: 96, max: 102 } as MeasurementRange,
      waist: { min: 80, max: 86 } as MeasurementRange,
      hips: { min: 98, max: 104 } as MeasurementRange,
      inseam: { min: 78, max: 82 } as MeasurementRange,
    },
    heightCm: 178,
    recommendedSize: 'M',
    fitPreference: 'regular',
  };

  it('should return a Blob', async () => {
    const result = await generateShareImage(sampleData);
    expect(result).toBeInstanceOf(Blob);
  });

  it('should create a 1080x1920 canvas', async () => {
    await generateShareImage(sampleData);
    expect(mockCanvas.width).toBe(1080);
    expect(mockCanvas.height).toBe(1920);
  });

  it('should draw DRIPFITCHECK wordmark', async () => {
    await generateShareImage(sampleData);
    const fillTextCalls = mockCtx.fillText.mock.calls;
    const hasDripFit = fillTextCalls.some(
      (call: any[]) => call[0] === 'DRIPFITCHECK'
    );
    expect(hasDripFit).toBe(true);
  });

  it('should draw measurement labels for provided measurements', async () => {
    await generateShareImage(sampleData);
    const fillTextCalls = mockCtx.fillText.mock.calls;
    const labels = fillTextCalls.map((c: any[]) => c[0]);
    expect(labels).toContain('SHOULDER');
    expect(labels).toContain('CHEST');
    expect(labels).toContain('WAIST');
    expect(labels).toContain('HIPS');
    expect(labels).toContain('INSEAM');
  });

  it('should skip missing measurement keys', async () => {
    const sparseData = {
      ...sampleData,
      measurements: {
        chest: { min: 96, max: 102 } as MeasurementRange,
      },
    };
    await generateShareImage(sparseData);
    const fillTextCalls = mockCtx.fillText.mock.calls;
    const labels = fillTextCalls.map((c: any[]) => c[0]);
    expect(labels).toContain('CHEST');
    expect(labels).not.toContain('SHOULDER');
    expect(labels).not.toContain('BUST');
  });

  it('should render size, fit, and height in the identity card', async () => {
    await generateShareImage(sampleData);
    const fillTextCalls = mockCtx.fillText.mock.calls;
    const values = fillTextCalls.map((c: any[]) => c[0]);
    expect(values).toContain('M');
    expect(values).toContain('Regular');
    expect(values).toContain('178cm');
  });

  it('should render the CTA text', async () => {
    await generateShareImage(sampleData);
    const fillTextCalls = mockCtx.fillText.mock.calls;
    const hasCta = fillTextCalls.some(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('dripfitcheck')
    );
    expect(hasCta).toBe(true);
  });

  it('should load Inter font before drawing', async () => {
    await generateShareImage(sampleData);
    expect(document.fonts.load).toHaveBeenCalledWith('bold 56px Inter');
  });
});
