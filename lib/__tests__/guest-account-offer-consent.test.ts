import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Consent on the confirmation account offer must never default to checked.
 * Pin the source so a future edit cannot ship pre-checked marketing opt-in.
 */
describe("GuestAccountOffer consent default", () => {
  it("initializes consentChecked to false (never pre-checked)", () => {
    const src = readFileSync(
      join(process.cwd(), "components/checkout/guest-account-offer.tsx"),
      "utf8",
    );
    expect(src).toMatch(/useState\(false\)/);
    expect(src).toMatch(/const \[consentChecked, setConsentChecked\] = useState\(false\)/);
    expect(src).not.toMatch(/useState\(true\)/);
    expect(src).toMatch(/marketingOptIn: consentChecked === true/);
  });

  it("emits account_offered_on_confirmation on mount", () => {
    const src = readFileSync(
      join(process.cwd(), "components/checkout/guest-account-offer.tsx"),
      "utf8",
    );
    expect(src).toContain('eventType: "account_offered_on_confirmation"');
  });

  it("Skapa konto is black primary and not gated on marketing consent", () => {
    const src = readFileSync(
      join(process.cwd(), "components/checkout/guest-account-offer.tsx"),
      "utf8",
    );
    expect(src).toMatch(
      /data-testid="guest-account-create"[\s\S]*?className="bg-black text-white/,
    );
    // Create only disables while submitting — not when consent unchecked.
    expect(src).toMatch(
      /data-testid="guest-account-create"[\s\S]*?disabled=\{submitting\}/,
    );
    expect(src).not.toMatch(/disabled=\{submitting \|\| !consentChecked\}/);
  });
});

describe("flag OFF login wall path preserved in checkout-client", () => {
  it("still mounts CheckoutEmailAuth only via showCheckoutLoginWall", () => {
    const src = readFileSync(
      join(process.cwd(), "app/checkout/checkout-client.tsx"),
      "utf8",
    );
    expect(src).toContain("showCheckoutLoginWall");
    expect(src).toContain("resolveGuestCheckoutAuthPath");
    expect(src).toContain("<CheckoutEmailAuth");
    // Wall must not be gated solely on !platformOpen anymore.
    expect(src).not.toMatch(
      /authChecked && !authReady && !platformOpen \? \(\s*<CheckoutEmailAuth/,
    );
  });
});
