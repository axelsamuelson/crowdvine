import { describe, expect, it } from "vitest";
import {
  deliveryLinesForAnalytics,
  formatCheckoutDraftSummary,
  missingCheckoutFields,
  postalDraftAnalytics,
} from "../checkout-draft-metadata";

describe("postalDraftAnalytics", () => {
  it("returns null for empty input", () => {
    expect(postalDraftAnalytics("")).toBeNull();
    expect(postalDraftAnalytics("   ")).toBeNull();
  });

  it("stores digits only and flags incomplete postcodes", () => {
    expect(postalDraftAnalytics("11")).toEqual({
      postal_digits: "11",
      digits: 2,
      complete: false,
    });
    expect(postalDraftAnalytics("114 28")).toEqual({
      postal_digits: "11428",
      digits: 5,
      complete: true,
    });
  });
});

describe("deliveryLinesForAnalytics", () => {
  it("never returns raw PII values", () => {
    const flags = deliveryLinesForAnalytics({
      fullName: "Anna Andersson",
      email: "anna@example.com",
      phone: "0701234567",
      street: "Storgatan 1",
      city: "Stockholm",
      postal: "11428",
      countryCode: "SE",
      regionCode: null,
    });
    expect(flags).toEqual({
      has_full_name: true,
      has_email: true,
      has_phone: true,
      has_street: true,
      has_city: true,
      has_postal: true,
      country_code: "SE",
      region_code: null,
    });
    expect(JSON.stringify(flags)).not.toMatch(/Anna|example\.com|070|Storgatan/);
  });
});

describe("formatCheckoutDraftSummary", () => {
  it("labels an incomplete postal on checkout_abandoned", () => {
    expect(
      formatCheckoutDraftSummary({
        postal_digits: "11",
        postal_complete: false,
        digits: 2,
      }),
    ).toBe("postnr 11 (2 siffror, ofullständigt)");
  });

  it("labels checkout_postal_started keystrokes", () => {
    expect(
      formatCheckoutDraftSummary({
        postal_digits: "114",
        digits: 3,
        complete: false,
      }),
    ).toBe("postnr 114 (3 siffror, ofullständigt)");
  });

  it("summarizes field flags without leaking historical PII keys", () => {
    expect(
      formatCheckoutDraftSummary({
        has_full_name: true,
        has_street: true,
        has_postal: true,
        has_city: true,
        postal_digits: "11428",
        postal_complete: true,
        abandon_reason: "incomplete_fields",
        field: "email",
        code: "fields_incomplete",
      }),
    ).toContain("incomplete_fields");
    expect(
      formatCheckoutDraftSummary({
        has_full_name: true,
        has_street: true,
        has_postal: true,
        has_city: true,
        postal_digits: "11428",
        postal_complete: true,
      }),
    ).toContain("ifyllt:");
  });
});

describe("missingCheckoutFields", () => {
  it("lists missing delivery fields", () => {
    expect(
      missingCheckoutFields(
        "delivery",
        deliveryLinesForAnalytics({
          fullName: null,
          email: "a@b.c",
          phone: null,
          street: "",
          city: "Stockholm",
          postal: "11428",
          countryCode: "SE",
          regionCode: null,
        }),
      ),
    ).toEqual(["street", "full_name"]);
  });
});
