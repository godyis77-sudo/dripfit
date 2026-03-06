import { describe, it, expect } from "vitest";

// Copied from Results.tsx (not exported)
const SIZE_LADDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

function shiftSize(size: string, delta: number): string {
  const idx = SIZE_LADDER.indexOf(size);
  if (idx === -1) return size;
  return SIZE_LADDER[Math.max(0, Math.min(SIZE_LADDER.length - 1, idx + delta))];
}

describe("shiftSize", () => {
  it("shifts M up by 1 to L", () => {
    expect(shiftSize("M", 1)).toBe("L");
  });

  it("shifts M down by 1 to S", () => {
    expect(shiftSize("M", -1)).toBe("S");
  });

  it("does not go below smallest size", () => {
    expect(shiftSize("XXS", -1)).toBe("XXS");
  });

  it("does not go above largest size", () => {
    expect(shiftSize("XXL", 1)).toBe("2XL");
  });

  it("handles empty string gracefully", () => {
    expect(shiftSize("", 1)).toBe("");
  });
});
