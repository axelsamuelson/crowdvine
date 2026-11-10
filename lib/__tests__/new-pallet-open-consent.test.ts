import { describe, expect, it } from "vitest";
import {
  MARKETING_MIN_AGE_YEARS,
  NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
  NEW_PALLET_OPEN_PURPOSE,
  meetsMarketingAge,
  selectNewPalletOpenRecipients,
  type MarketingConsentRow,
} from "@/lib/marketing/new-pallet-open-consent";

function row(
  partial: Partial<MarketingConsentRow> & Pick<MarketingConsentRow, "email">,
): MarketingConsentRow {
  return {
    id: partial.id ?? "id-1",
    user_id: partial.user_id ?? null,
    email: partial.email,
    purpose: partial.purpose ?? NEW_PALLET_OPEN_PURPOSE,
    text_version_id:
      partial.text_version_id ?? NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
    consented_at: partial.consented_at ?? "2026-11-09T12:00:00.000Z",
    withdrawn_at: partial.withdrawn_at ?? null,
    unsubscribe_token: partial.unsubscribe_token ?? "tok-1",
  };
}

describe("new-pallet-open marketing consent", () => {
  const at = new Date("2026-11-09T12:00:00.000Z");

  it("exposes purpose + text version constants", () => {
    expect(NEW_PALLET_OPEN_PURPOSE).toBe("new_pallet_open");
    expect(NEW_PALLET_OPEN_CONSENT_TEXT_VERSION).toMatch(/^new_pallet_open_v/);
    expect(MARKETING_MIN_AGE_YEARS).toBe(25);
  });

  it("meetsMarketingAge: 25+ only", () => {
    expect(meetsMarketingAge("2000-01-01", at)).toBe(true);
    expect(meetsMarketingAge("2001-11-09", at)).toBe(true);
    expect(meetsMarketingAge("2001-11-10", at)).toBe(false);
    expect(meetsMarketingAge("2010-05-01", at)).toBe(false);
    expect(meetsMarketingAge(null, at)).toBe(false);
    expect(meetsMarketingAge("not-a-date", at)).toBe(false);
  });

  it("selectNewPalletOpenRecipients excludes withdrawn and under-25", () => {
    const consents = [
      row({ email: "ok@example.test", unsubscribe_token: "a" }),
      row({
        email: "young@example.test",
        unsubscribe_token: "b",
      }),
      row({
        email: "gone@example.test",
        unsubscribe_token: "c",
        withdrawn_at: "2026-11-01T00:00:00.000Z",
      }),
      row({
        email: "other@example.test",
        purpose: "something_else",
        unsubscribe_token: "d",
      }),
    ];
    const recipients = selectNewPalletOpenRecipients({
      consents,
      birthDateByEmail: {
        "ok@example.test": "1990-01-15",
        "young@example.test": "2010-01-01",
        "gone@example.test": "1980-01-01",
        "other@example.test": "1980-01-01",
      },
      at,
    });
    expect(recipients).toEqual([
      {
        email: "ok@example.test",
        user_id: null,
        unsubscribe_token: "a",
        text_version_id: NEW_PALLET_OPEN_CONSENT_TEXT_VERSION,
      },
    ]);
  });

  it("dedupes by email (keeps first active)", () => {
    const recipients = selectNewPalletOpenRecipients({
      consents: [
        row({ email: "A@Example.TEST", unsubscribe_token: "first" }),
        row({ email: "a@example.test", unsubscribe_token: "second" }),
      ],
      birthDateByEmail: { "a@example.test": "1985-06-01" },
      at,
    });
    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.unsubscribe_token).toBe("first");
  });
});
