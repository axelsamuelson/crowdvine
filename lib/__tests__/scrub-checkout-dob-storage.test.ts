import { describe, expect, it } from "vitest";
import {
  CHECKOUT_LOCAL_DRAFT_STORAGE_KEYS,
  draftContainsDobField,
  scrubCheckoutDobFromBrowserStorage,
  stripDobFieldsFromDraft,
} from "@/lib/checkout/scrub-checkout-dob-storage";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    },
    _dump() {
      return Object.fromEntries(map);
    },
  };
}

describe("scrubCheckoutDobFromBrowserStorage (Camille / Juliette)", () => {
  it("strips DOB fields from a draft object without touching contact/address", () => {
    const draft = {
      email: "guest@example.com",
      fullName: "Test Gäst",
      phone: "0701234567",
      street: "Drottninggatan 12",
      postal: "11151",
      city: "Stockholm",
      date_of_birth: "1990-01-15",
      dateOfBirth: "1990-01-15",
      nested: { dob: "1990-01-15", city: "Stockholm" },
    };
    const { next, removed } = stripDobFieldsFromDraft(draft);
    expect(removed).toBe(true);
    expect(draftContainsDobField(next)).toBe(false);
    expect(next).toEqual({
      email: "guest@example.com",
      fullName: "Test Gäst",
      phone: "0701234567",
      street: "Drottninggatan 12",
      postal: "11151",
      city: "Stockholm",
      nested: { city: "Stockholm" },
    });
  });

  it("scrubs Camille 1985-05-15 from pre-PR289 keys (checkoutFormData + standalone)", () => {
    const local = memoryStorage({
      checkoutFormData: JSON.stringify({
        fullName: "Camille Test",
        email: "camille@example.com",
        phone: "0701112233",
        street: "Gatan 1",
        postcode: "11151",
        city: "Stockholm",
        countryCode: "SE",
        dateOfBirth: "1985-05-15",
        date_of_birth: "1985-05-15",
      }),
      date_of_birth: "1985-05-15",
      age_dob: "1985-05-15",
      "age-dob": "1985-05-15",
      pact_checkout_draft: JSON.stringify({
        email: "keep@example.com",
        street: "Keepgatan 2",
        dob: "1985-05-15",
      }),
      other_pref: "keep-me",
    });
    const session = memoryStorage({
      checkoutFormData: JSON.stringify({
        email: "session@example.com",
        dateOfBirth: "1985-05-15",
      }),
      checkout_dateOfBirth: "1985-05-15",
      pact_checkout_started: "1",
    });

    const result = scrubCheckoutDobFromBrowserStorage({
      localStorage: local,
      sessionStorage: session,
    });

    expect(result.fieldsRemoved).toBeGreaterThan(0);

    const localDump = local._dump();
    expect(localDump.other_pref).toBe("keep-me");
    expect(localDump.date_of_birth).toBeUndefined();
    expect(localDump.age_dob).toBeUndefined();
    expect(localDump["age-dob"]).toBeUndefined();
    expect(JSON.parse(localDump.checkoutFormData)).toEqual({
      fullName: "Camille Test",
      email: "camille@example.com",
      phone: "0701112233",
      street: "Gatan 1",
      postcode: "11151",
      city: "Stockholm",
      countryCode: "SE",
    });
    expect(JSON.parse(localDump.pact_checkout_draft)).toEqual({
      email: "keep@example.com",
      street: "Keepgatan 2",
    });
    expect(draftContainsDobField(JSON.parse(localDump.checkoutFormData))).toBe(
      false,
    );

    const sessionDump = session._dump();
    expect(sessionDump.pact_checkout_started).toBe("1");
    expect(sessionDump.checkout_dateOfBirth).toBeUndefined();
    expect(JSON.parse(sessionDump.checkoutFormData).dateOfBirth).toBeUndefined();
  });

  it("deletes plain ISO date under checkout-ish key names", () => {
    const local = memoryStorage({
      checkout_saved_dob: "1985-05-15",
      random_note: "1985-05-15",
    });
    scrubCheckoutDobFromBrowserStorage({ localStorage: local });
    const dump = local._dump();
    expect(dump.checkout_saved_dob).toBeUndefined();
    // Non-checkout key with ISO date alone is left (avoid collateral deletes).
    expect(dump.random_note).toBe("1985-05-15");
  });

  it("lists known draft keys including legacy checkoutFormData", () => {
    expect(CHECKOUT_LOCAL_DRAFT_STORAGE_KEYS).toContain("checkoutFormData");
    expect(CHECKOUT_LOCAL_DRAFT_STORAGE_KEYS).toContain("pact_checkout_draft");
  });

  it("checkout client wires scrub on mount and disables DOB autocomplete", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "app/checkout/checkout-client.tsx"),
      "utf8",
    );
    expect(src).toMatch(/scrubCheckoutDobFromBrowserStorage/);
    expect(src).toMatch(/autoComplete=\"off\"/);
    expect(src).not.toMatch(/autoComplete=\"bday\"/);
  });
});
