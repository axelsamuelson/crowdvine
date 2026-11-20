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

describe("scrubCheckoutDobFromBrowserStorage (Juliette)", () => {
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

  it("scrubs DOB from localStorage draft and deletes standalone DOB keys", () => {
    const draftKey = CHECKOUT_LOCAL_DRAFT_STORAGE_KEYS[0];
    const local = memoryStorage({
      [draftKey]: JSON.stringify({
        email: "guest@example.com",
        street: "Drottninggatan 12",
        date_of_birth: "1988-05-01",
      }),
      date_of_birth: "1988-05-01",
      other_pref: "keep-me",
    });
    const session = memoryStorage({
      checkout_dateOfBirth: "1988-05-01",
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
    expect(JSON.parse(localDump[draftKey])).toEqual({
      email: "guest@example.com",
      street: "Drottninggatan 12",
    });
    expect(session._dump().pact_checkout_started).toBe("1");
    expect(session._dump().checkout_dateOfBirth).toBeUndefined();
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
