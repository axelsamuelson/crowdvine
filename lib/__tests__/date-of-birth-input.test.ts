import { describe, expect, it } from "vitest";

import {
  maskIsoDateDigits,
  parseCheckoutDateOfBirthInput,
} from "@/lib/checkout/date-of-birth-input";

describe("maskIsoDateDigits", () => {
  it("inserts dashes as digits are typed", () => {
    expect(maskIsoDateDigits("1990")).toBe("1990");
    expect(maskIsoDateDigits("199001")).toBe("1990-01");
    expect(maskIsoDateDigits("19900115")).toBe("1990-01-15");
  });

  it("strips non-digits and caps at 8 digits", () => {
    expect(maskIsoDateDigits("1990-01-15")).toBe("1990-01-15");
    expect(maskIsoDateDigits("1990ab0115xx99")).toBe("1990-01-15");
  });
});

describe("parseCheckoutDateOfBirthInput — age 20 boundary", () => {
  const asOf = new Date(Date.UTC(2026, 7, 25)); // 2026-08-25

  it("accepts exactly 20 on birthday", () => {
    const r = parseCheckoutDateOfBirthInput("2006-08-25", 20, asOf);
    expect(r).toEqual({ ok: true, iso: "2006-08-25" });
  });

  it("rejects day before 20th birthday", () => {
    const r = parseCheckoutDateOfBirthInput("2006-08-26", 20, asOf);
    expect(r).toEqual({
      ok: false,
      reason: "under_age",
      iso: "2006-08-26",
    });
  });

  it("rejects calendar-invalid dates while preserving input", () => {
    const r = parseCheckoutDateOfBirthInput("2026-02-31", 20, asOf);
    expect(r).toEqual({
      ok: false,
      reason: "invalid_format",
      iso: "2026-02-31",
    });
  });

  it("treats incomplete typing as incomplete (no hard error yet)", () => {
    expect(parseCheckoutDateOfBirthInput("2006-08", 20, asOf)).toEqual({
      ok: false,
      reason: "incomplete",
      iso: "2006-08",
    });
    expect(parseCheckoutDateOfBirthInput("", 20, asOf)).toEqual({
      ok: false,
      reason: "incomplete",
      iso: "",
    });
  });

  it("requires DOB — empty never ok", () => {
    expect(parseCheckoutDateOfBirthInput("   ", 20, asOf).ok).toBe(false);
  });
});
