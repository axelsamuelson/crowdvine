import { describe, expect, it } from "vitest";
import {
  CHECKOUT_PALLET_FILL_INCLUDES_CUSTOMER_CART,
  CHECKOUT_PALLET_FILL_OPENED_THRESHOLD,
  PALLET_BAR_MIN_FILL,
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
    expect(d!.showBar).toBe(true);
  });

  it("aliases CHECKOUT_PALLET_FILL_OPENED_THRESHOLD to PALLET_BAR_MIN_FILL", () => {
    expect(PALLET_BAR_MIN_FILL).toBe(0.15);
    expect(CHECKOUT_PALLET_FILL_OPENED_THRESHOLD).toBe(PALLET_BAR_MIN_FILL);
  });

  it("hides the bar below 15% fill but still returns count text fields", () => {
    // 16 / 300 ≈ 5.3% < 0.15
    const d = resolveCheckoutPalletFillDisplay({
      palletId: "p1",
      reservedBottles: 10,
      capacity: 300,
      cartBottles: 6,
      fillAvailable: true,
    });
    expect(d).not.toBeNull();
    expect(d!.fillCount).toBe(16);
    expect(d!.capacity).toBe(300);
    expect(d!.fillPercent).toBeLessThan(15);
    expect(d!.showBar).toBe(false);
    expect(d!.useOpenedCopy).toBe(false);
  });

  it("shows the bar at exactly 15% fill", () => {
    // 45 / 300 = 0.15
    const d = resolveCheckoutPalletFillDisplay({
      palletId: "p1",
      reservedBottles: 40,
      capacity: 300,
      cartBottles: 5,
      fillAvailable: true,
    });
    expect(d).not.toBeNull();
    expect(d!.fillCount).toBe(45);
    expect(d!.fillPercent).toBe(15);
    expect(d!.showBar).toBe(true);
  });

  it("shows the bar above 15% fill", () => {
    // 46 / 300 ≈ 15.3% > 0.15
    const d = resolveCheckoutPalletFillDisplay({
      palletId: "p1",
      reservedBottles: 40,
      capacity: 300,
      cartBottles: 6,
      fillAvailable: true,
    });
    expect(d).not.toBeNull();
    expect(d!.fillCount).toBe(46);
    expect(d!.showBar).toBe(true);
  });

  it("just below threshold stays bar-hidden", () => {
    // 44 / 300 ≈ 14.67% < 0.15
    const d = resolveCheckoutPalletFillDisplay({
      palletId: "p1",
      reservedBottles: 40,
      capacity: 300,
      cartBottles: 4,
      fillAvailable: true,
    });
    expect(d).not.toBeNull();
    expect(d!.fillCount).toBe(44);
    expect(d!.showBar).toBe(false);
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
  it("SV/EN fill labels are count-only (no opened prefix)", () => {
    expect(
      dualOfferMsg("sv", "dualOfferPalletFillStatus", {
        filled: "16",
        total: "300",
      }),
    ).toBe("16 av 300 flaskor beställda");
    expect(
      dualOfferMsg("en", "dualOfferPalletFillStatus", {
        filled: "16",
        total: "300",
      }),
    ).toBe("16 of 300 bottles ordered");
    // Opened key kept as alias of the same count-only string.
    expect(
      dualOfferMsg("sv", "dualOfferPalletFillOpened", {
        filled: "16",
        total: "300",
      }),
    ).toBe("16 av 300 flaskor beställda");
    expect(
      dualOfferMsg("en", "dualOfferPalletFillOpened", {
        filled: "16",
        total: "300",
      }),
    ).toBe("16 of 300 bottles ordered");
  });

  it("legal line charges once and gains switch when direct on", () => {
    const sv = dualOfferMsg("sv", "dualOfferLegalLineShared", {
      total: "1 283 kr",
      datum: "7 dec",
    });
    expect(sv).toBe(
      "Köpet är bindande. Vi sparar ditt kort och debiterar 1 283 kr först när pallen stänger, senast 7 dec. Fylls inte pallen väljer du själv om du vill vänta eller avboka utan kostnad.",
    );
    expect(sv).not.toMatch(/eller byta/);

    const svSwitch = dualOfferMsg("sv", "dualOfferLegalLineSharedWithSwitch", {
      total: "1 283 kr",
      datum: "7 dec",
    });
    expect(svSwitch).toMatch(/vänta, avboka utan kostnad eller byta/);

    const en = dualOfferMsg("en", "dualOfferLegalLineShared", {
      total: "1 283 SEK",
      datum: "7 Dec",
    });
    expect(en).toBe(
      "The purchase is binding. We save your card and charge 1 283 SEK only when the pallet closes, by 7 Dec at the latest. If the pallet doesn't fill, you choose whether to wait or cancel free of charge.",
    );
    expect(en).not.toMatch(/or switch/);

    const enSwitch = dualOfferMsg("en", "dualOfferLegalLineSharedWithSwitch", {
      total: "1 283 SEK",
      datum: "7 Dec",
    });
    expect(enSwitch).toMatch(/wait, cancel free of charge or switch/);
  });
});
