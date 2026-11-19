import { describe, expect, it } from "vitest";
import { lowNLevel, wilsonInterval } from "@/lib/analytics/v2/wilson";

describe("wilsonInterval", () => {
  it("returns zeros for empty total", () => {
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 0 });
  });

  it("contains the point estimate for moderate n", () => {
    const { low, high } = wilsonInterval(10, 100);
    expect(low).toBeGreaterThan(0);
    expect(high).toBeLessThan(1);
    expect(low).toBeLessThan(0.1);
    expect(high).toBeGreaterThan(0.1);
  });

  it("is wide when n is small", () => {
    const small = wilsonInterval(1, 5);
    const large = wilsonInterval(20, 100);
    expect(small.high - small.low).toBeGreaterThan(large.high - large.low);
  });

  it("clamps to [0, 1]", () => {
    const all = wilsonInterval(50, 50);
    expect(all.low).toBeGreaterThanOrEqual(0);
    expect(all.high).toBeLessThanOrEqual(1);
    const none = wilsonInterval(0, 50);
    expect(none.low).toBeGreaterThanOrEqual(0);
    expect(none.high).toBeLessThanOrEqual(1);
  });
});

describe("lowNLevel (spec 6.6)", () => {
  it("hides below 10", () => {
    expect(lowNLevel(0)).toBe("hide");
    expect(lowNLevel(9)).toBe("hide");
  });

  it("cautions from 10 inclusive to 29", () => {
    expect(lowNLevel(10)).toBe("caution");
    expect(lowNLevel(29)).toBe("caution");
  });

  it("ok at 30+", () => {
    expect(lowNLevel(30)).toBe("ok");
    expect(lowNLevel(200)).toBe("ok");
  });
});
