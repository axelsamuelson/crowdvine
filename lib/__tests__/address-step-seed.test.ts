import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveAddressStepPanel,
  shouldClearDeliveryDraftOnSeed,
  shouldResetAddressFocusWhenDraftMissing,
} from "@/lib/checkout/address-step-seed";

const checkoutSrc = readFileSync(
  join(process.cwd(), "app/checkout/checkout-client.tsx"),
  "utf8",
);

describe("address-step-seed — city focus vs complete zone row", () => {
  it("keeps the form (does not clear draft) while city field has focus after zone-addresses returns a complete row", () => {
    // Zone fetch completed with a full row + contact while ortfältet is focused.
    expect(
      shouldClearDeliveryDraftOnSeed({
        hasCompleteZoneRow: true,
        contactOk: true,
        editingAddress: false,
        addressFieldFocused: true,
      }),
    ).toBe(false);

    expect(
      resolveAddressStepPanel({
        addressStepComplete: true,
        editingAddress: false,
        addressFieldFocused: true,
        hasDeliveryDraft: true,
      }),
    ).toBe("form");
  });

  it("clears draft after blur so the summary can show", () => {
    expect(
      shouldClearDeliveryDraftOnSeed({
        hasCompleteZoneRow: true,
        contactOk: true,
        editingAddress: false,
        addressFieldFocused: false,
      }),
    ).toBe(true);

    expect(
      resolveAddressStepPanel({
        addressStepComplete: true,
        editingAddress: false,
        addressFieldFocused: false,
        hasDeliveryDraft: false,
      }),
    ).toBe("summary");
  });
});

describe("address-step-seed — stuck spinner recovery", () => {
  it("never leaves deliveryDraft=null + addressFieldFocused=true as a permanent loading state", () => {
    const stuck = {
      addressStepComplete: false,
      editingAddress: false,
      addressFieldFocused: true,
      hasDeliveryDraft: false,
    };

    // Without recovery this would be the eternal "Laddar vinzon…" branch.
    expect(resolveAddressStepPanel(stuck)).toBe("loading");
    expect(
      shouldResetAddressFocusWhenDraftMissing({
        hasDeliveryDraft: false,
        addressFieldFocused: true,
      }),
    ).toBe(true);

    // After focus reset, seed can recreate the draft → form (not spinner).
    const afterFocusReset = {
      ...stuck,
      addressFieldFocused: false,
      hasDeliveryDraft: true,
    };
    expect(resolveAddressStepPanel(afterFocusReset)).toBe("form");
    expect(resolveAddressStepPanel(afterFocusReset)).not.toBe("loading");
  });
});

describe("checkout-client wiring for address-step-seed", () => {
  it("gates seed clear on !addressFieldFocused and resets focus when draft is missing", () => {
    expect(checkoutSrc).toMatch(/shouldClearDeliveryDraftOnSeed/);
    expect(checkoutSrc).toMatch(/shouldResetAddressFocusWhenDraftMissing/);
    expect(checkoutSrc).toMatch(/addressFieldFocused/);
    // Seed clear must include the focus guard (regression of stuck spinner).
    expect(checkoutSrc).toMatch(
      /shouldClearDeliveryDraftOnSeed\(\{[\s\S]*?addressFieldFocused[\s\S]*?\}\)/,
    );
  });
});
