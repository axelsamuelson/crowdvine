import { describe, expect, it } from "vitest";
import { analyticsCheckoutStep } from "@/lib/analytics/v2/checkout-step";

describe("analyticsCheckoutStep", () => {
  it("passes through named steps", () => {
    expect(analyticsCheckoutStep({ step: "postal" })).toBe("postal");
    expect(analyticsCheckoutStep({ step: "delivery" })).toBe("delivery");
    expect(analyticsCheckoutStep({ step: "age_terms" })).toBe("age_terms");
    expect(analyticsCheckoutStep({ step: "payment" })).toBe("payment");
  });

  it("maps legacy numeric steps", () => {
    expect(analyticsCheckoutStep({ step: "1" })).toBe("postal");
    expect(analyticsCheckoutStep({ step: "2" })).toBe("delivery");
    expect(analyticsCheckoutStep({ step: "3" })).toBe("age_terms");
    expect(analyticsCheckoutStep({ step: "4" })).toBe("payment");
  });

  it("maps legacy phase values when step is absent", () => {
    expect(analyticsCheckoutStep({ phase: "compliance" })).toBe("age_terms");
    expect(analyticsCheckoutStep({ phase: "payment" })).toBe("payment");
    expect(analyticsCheckoutStep({ phase: "payment_ready" })).toBe("payment");
    expect(analyticsCheckoutStep({ phase: "delivery" })).toBe("delivery");
  });

  it("prefers named step over phase", () => {
    expect(
      analyticsCheckoutStep({ step: "postal", phase: "payment_ready" }),
    ).toBe("postal");
  });

  it("returns null when unmapped", () => {
    expect(analyticsCheckoutStep({})).toBeNull();
    expect(analyticsCheckoutStep(null)).toBeNull();
    expect(analyticsCheckoutStep({ step: "cart" })).toBeNull();
  });
});
