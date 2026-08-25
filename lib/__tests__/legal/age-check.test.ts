import { describe, expect, it } from "vitest";

import {
  calculateAge,
  evaluateLegalGate,
  parseIsoDateOnly,
} from "@/lib/legal/age-check";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

function utcDate(iso: string): Date {
  const d = parseIsoDateOnly(iso);
  if (!d) throw new Error(`bad date ${iso}`);
  return d;
}

describe("calculateAge", () => {
  it("returns 19 for birthday tomorrow", () => {
    const now = new Date(Date.UTC(2026, 7, 25));
    const dob = utcDate("2006-08-26");
    expect(calculateAge(dob, now)).toBe(19);
  });

  it("returns 20 on exact 20th birthday", () => {
    const now = new Date(Date.UTC(2026, 7, 25));
    const dob = utcDate("2006-08-25");
    expect(calculateAge(dob, now)).toBe(20);
  });

  it("handles leap day birthdays after Feb 29 in a leap year", () => {
    const now = new Date(Date.UTC(2024, 1, 29));
    const dob = utcDate("2004-02-29");
    expect(calculateAge(dob, now)).toBe(20);
  });
});

describe("evaluateLegalGate", () => {
  const now = new Date(Date.UTC(2026, 7, 25));

  it("rejects missing dateOfBirth", () => {
    expect(
      evaluateLegalGate(
        { acceptedTermsVersion: LEGAL_VERSIONS.terms },
        now,
      ),
    ).toEqual({ ok: false, reason: "validation_error" });
  });

  it("rejects underage", () => {
    expect(
      evaluateLegalGate(
        {
          dateOfBirth: "2007-08-25",
          acceptedTermsVersion: LEGAL_VERSIONS.terms,
        },
        now,
      ),
    ).toEqual({ ok: false, reason: "age_requirement_not_met" });
  });

  it("rejects stale terms", () => {
    expect(
      evaluateLegalGate(
        {
          dateOfBirth: "2000-01-01",
          acceptedTermsVersion: "1999-01-01",
        },
        now,
      ),
    ).toEqual({
      ok: false,
      reason: "terms_version_stale",
      currentVersion: LEGAL_VERSIONS.terms,
    });
  });

  it("accepts exactly 20 today", () => {
    const result = evaluateLegalGate(
      {
        dateOfBirth: "2006-08-25",
        acceptedTermsVersion: LEGAL_VERSIONS.terms,
      },
      now,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.dateOfBirth).toBe("2006-08-25");
    }
  });
});
