import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock posthog-js before importing analytics
vi.mock("posthog-js", () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock sessionStorage
const store: Record<string, string> = {};
vi.stubGlobal("sessionStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

describe("analytics", () => {
  let analytics: typeof import("@/lib/analytics");

  beforeEach(async () => {
    vi.resetModules();
    analytics = await import("@/lib/analytics");
  });

  it("trackEvent does not throw with a valid event", () => {
    expect(() => analytics.trackEvent("scan_started")).not.toThrow();
  });

  it("trackEvent does not throw when PostHog is not initialised", () => {
    expect(() => analytics.trackEvent("results_viewed", { foo: "bar" })).not.toThrow();
  });

  it("identify does not throw with a userId", () => {
    expect(() => analytics.identify("user-123", { email: "a@b.com" })).not.toThrow();
  });

  it("resetAnalytics does not throw", () => {
    expect(() => analytics.resetAnalytics()).not.toThrow();
  });
});
