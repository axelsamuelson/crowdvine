import { describe, expect, it } from "vitest";
import {
  formatCheckoutDraftSummary,
  postalDraftAnalytics,
} from "../checkout-draft-metadata";

describe("postalDraftAnalytics", () => {
  it("returns null for empty input", () => {
    expect(postalDraftAnalytics("")).toBeNull();
    expect(postalDraftAnalytics("   ")).toBeNull();
  });

  it("counts digits and flags incomplete postcodes", () => {
    expect(postalDraftAnalytics("11")).toEqual({
      postal: "11",
      digits: 2,
      complete: false,
    });
    expect(postalDraftAnalytics("114 28")).toEqual({
      postal: "11428",
      digits: 5,
      complete: true,
    });
  });
});

describe("formatCheckoutDraftSummary", () => {
  it("labels an incomplete postal on checkout_abandoned", () => {
    expect(
      formatCheckoutDraftSummary({
        postal: "11",
        postal_complete: false,
        digits: 2,
      }),
    ).toBe("postnr 11 (2 siffror, ofullständigt)");
  });

  it("labels checkout_postal_started keystrokes", () => {
    expect(
      formatCheckoutDraftSummary({
        postal: "114",
        digits: 3,
        complete: false,
      }),
    ).toBe("postnr 114 (3 siffror, ofullständigt)");
  });

  it("keeps a completed address compact", () => {
    expect(
      formatCheckoutDraftSummary({
        full_name: "Anna",
        street: "Storgatan 1",
        postal: "11428",
        city: "Stockholm",
        postal_complete: true,
      }),
    ).toBe("Anna · Storgatan 1, 11428, Stockholm");
  });
});
