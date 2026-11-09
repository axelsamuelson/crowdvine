import { describe, expect, it } from "vitest";
import {
  CHECKOUT_PALLET_FILL_INCLUDES_CUSTOMER_CART,
  CHECKOUT_PALLET_FILL_OPENED_THRESHOLD,
  resolveCheckoutPalletFillDisplay,
} from "@/lib/checkout/pallet-fill-display";
import { dualOfferMsg } from "@/lib/checkout/dual-offer-customer-copy";

describe("resolveCheckoutPalletFillDisplay", () => {
  it("includes customer cart bottles in fill_count (documented policy)", () => {
    expect(CHECKOUT_PALLET_FILL_INCLUDES_CUSTOMER_CART).toBe(true);
    const d = resolveCheckoutPalletFillDisplay({
      palletId: "p1",
      reservedBottles: 400,
      capacity: 600,
      cartBottles: 12,
      fillAvailable: true,
    });
    expect(d).not.toBeNull();
    expect(d!.fillCount).toBe(412);
    expect(d!.capacity).toBe(600);
    expect(d!.includesCustomerCart).toBe(true);
    expect(d!.useOpenedCopy).toBe(false);
  });

  it("uses opened copy below 20% fill and never hides for low fill", () => {
    expect(CHECKOUT_PALLET_FILL_OPENED_THRESHOLD).toBe(0.2);
    const d = resolveCheckoutPalletFillDisplay({
      palletId: "p1",
      reservedBottles: 30,
      capacity: 600,
      cartBottles: 8,
      fillAvailable: true,
    });
    expect(d).not.toBeNull();
    expect(d!.fillCount).toBe(38);
    expect(d!.useOpenedCopy).toBe(true);
    expect(d!.fillPercent).toBeLessThan(20);
  });

  it("hides entirely when fill is missing or unavailable", () => {
    expect(
      resolveCheckoutPalletFillDisplay({
        palletId: "p1",
        reservedBottles: 10,
        capacity: 600,
        cartBottles: 2,
        fillAvailable: false,
      }),
    ).toBeNull();
    expect(
      resolveCheckoutPalletFillDisplay({
        palletId: "",
        reservedBottles: 10,
        capacity: 600,
        cartBottles: 2,
      }),
    ).toBeNull();
    expect(
      resolveCheckoutPalletFillDisplay({
        palletId: "p1",
        reservedBottles: null,
        capacity: 600,
        cartBottles: 2,
      }),
    ).toBeNull();
    expect(
      resolveCheckoutPalletFillDisplay({
        palletId: "p1",
        reservedBottles: 10,
        capacity: 0,
        cartBottles: 2,
      }),
    ).toBeNull();
  });
});

describe("checkout pallet fill + legal copy", () => {
  it("SV/EN fill labels match CRO wording", () => {
    expect(
      dualOfferMsg("sv", "dualOfferPalletFillStatus", {
        filled: "412",
        total: "600",
      }),
    ).toBe("Pallen: 412 av 600 flaskor beställda");
    expect(
      dualOfferMsg("en", "dualOfferPalletFillStatus", {
        filled: "412",
        total: "600",
      }),
    ).toBe("Pallet: 412 of 600 bottles ordered");
    expect(
      dualOfferMsg("sv", "dualOfferPalletFillOpened", {
        filled: "38",
        total: "600",
      }),
    ).toBe("Pallen har öppnat: 38 av 600 flaskor beställda");
    expect(
      dualOfferMsg("en", "dualOfferPalletFillOpened", {
        filled: "38",
        total: "600",
      }),
    ).toBe("The pallet has opened: 38 of 600 bottles ordered");
  });

  it("legal line merges wait/cancel once and gains switch when direct on", () => {
    const sv = dualOfferMsg("sv", "dualOfferLegalLineShared", {
      total: "1 283 kr",
      datum: "7 dec",
    });
    expect(sv).toMatch(/vänta eller avboka utan kostnad/);
    expect(sv).not.toMatch(/eller byta/);
    // Charge timing once
    expect(sv.match(/debiteras först när pallen stänger/g)?.length).toBe(1);
    expect(sv).not.toMatch(/debiterar .* när pallen stänger.*debiteras först/);

    const svSwitch = dualOfferMsg("sv", "dualOfferLegalLineSharedWithSwitch", {
      total: "1 283 kr",
      datum: "7 dec",
    });
    expect(svSwitch).toMatch(/vänta, avboka utan kostnad eller byta/);

    const en = dualOfferMsg("en", "dualOfferLegalLineShared", {
      total: "1 283 SEK",
      datum: "7 Dec",
    });
    expect(en).toMatch(/wait or cancel free of charge/);
    expect(en).not.toMatch(/or switch/);
    expect(en.match(/only charged when the pallet closes/g)?.length).toBe(1);

    const enSwitch = dualOfferMsg("en", "dualOfferLegalLineSharedWithSwitch", {
      total: "1 283 SEK",
      datum: "7 Dec",
    });
    expect(enSwitch).toMatch(/wait, cancel free of charge or switch/);
  });
});
