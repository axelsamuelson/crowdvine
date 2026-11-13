import { describe, expect, it } from "vitest";

import {
  applyBackspaceOverHyphen,
  caretAfterDigitCount,
  digitCountBefore,
  formatDobInputChange,
  maskIsoDateDigits,
  parseCheckoutDateOfBirthInput,
} from "@/lib/checkout/date-of-birth-input";

describe("maskIsoDateDigits / paste parity", () => {
  it("paste 19900115 and 1990-01-15 yield the same value", () => {
    expect(maskIsoDateDigits("19900115")).toBe("1990-01-15");
    expect(maskIsoDateDigits("1990-01-15")).toBe("1990-01-15");
    expect(maskIsoDateDigits("19900115")).toBe(maskIsoDateDigits("1990-01-15"));
  });

  it("inserts dashes as digits are typed", () => {
    expect(maskIsoDateDigits("1990")).toBe("1990");
    expect(maskIsoDateDigits("199001")).toBe("1990-01");
    expect(maskIsoDateDigits("19900115")).toBe("1990-01-15");
  });
});

describe("caret mapping (never jumps relative to digit index)", () => {
  it("maps digit counts through inserted hyphens", () => {
    expect(digitCountBefore("1990-01", 5)).toBe(4); // caret after hyphen
    expect(caretAfterDigitCount("1990-01", 4)).toBe(4); // after '0' of year
    expect(caretAfterDigitCount("1990-01", 5)).toBe(6); // after first month digit
  });

  it("formatDobInputChange keeps caret after the same digit count", () => {
    // Typing '1' after "1990" → "1990-1", caret was at 4
    const a = formatDobInputChange("19901", 5);
    expect(a.value).toBe("1990-1");
    expect(a.caret).toBe(6);

    // Paste full unformatted at end
    const b = formatDobInputChange("19900115", 8);
    expect(b.value).toBe("1990-01-15");
    expect(b.caret).toBe(10);
  });

  it("Backspace over a hyphen deletes the previous digit (not stuck)", () => {
    // "1990-|" → delete digit '0' of year → "199"
    const r = applyBackspaceOverHyphen("1990-", 5, 5);
    expect(r).not.toBeNull();
    expect(r!.value).toBe("199");
    expect(r!.caret).toBe(3);

    // "1990-01-|" → delete '1' of day-start month end → "1990-0"
    const r2 = applyBackspaceOverHyphen("1990-01-", 8, 8);
    expect(r2).not.toBeNull();
    expect(r2!.value).toBe("1990-0");
    expect(digitCountBefore(r2!.value, r2!.caret)).toBe(5);
  });

  it("Backspace in the middle of a selection is not special-cased", () => {
    expect(applyBackspaceOverHyphen("1990-01-15", 2, 5)).toBeNull();
  });
});

describe("parseCheckoutDateOfBirthInput — age 20 + nonexistent", () => {
  const asOf = new Date(Date.UTC(2026, 7, 25)); // 2026-08-25

  it("accepts exactly 20 on birthday", () => {
    expect(parseCheckoutDateOfBirthInput("2006-08-25", 20, asOf)).toEqual({
      ok: true,
      iso: "2006-08-25",
    });
  });

  it("rejects day before 20th birthday", () => {
    expect(parseCheckoutDateOfBirthInput("2006-08-26", 20, asOf)).toEqual({
      ok: false,
      reason: "under_age",
      iso: "2006-08-26",
    });
  });

  it("rejects nonexistent calendar dates as nonexistent_date", () => {
    expect(parseCheckoutDateOfBirthInput("2026-02-31", 20, asOf)).toEqual({
      ok: false,
      reason: "nonexistent_date",
      iso: "2026-02-31",
    });
  });

  it("treats incomplete typing as incomplete", () => {
    expect(parseCheckoutDateOfBirthInput("2006-08", 20, asOf)).toEqual({
      ok: false,
      reason: "incomplete",
      iso: "2006-08",
    });
  });
});
