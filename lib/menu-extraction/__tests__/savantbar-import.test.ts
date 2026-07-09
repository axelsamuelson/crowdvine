import { describe, it, expect } from "vitest";
import {
  isActiveSavantbarOther,
  isActiveSavantbarVin,
  mapSavantbarRowPrices,
} from "../savantbar-import";
import type { SavantbarOtherFields, SavantbarVinFields } from "../savantbar-schema";

describe("mapSavantbarRowPrices", () => {
  it("maps bottle from Price only; glass stays null", () => {
    const fields = {
      Price: 825,
      "Glass Price Est": 178,
      Glass: ["recuo9WRWyfXcZfbV"],
      "Glass copy": "Completement Red",
    } as SavantbarVinFields;

    expect(mapSavantbarRowPrices(fields)).toEqual({
      price_bottle: 825,
      price_glass: null,
    });
  });

  it("returns null bottle when Price missing", () => {
    expect(mapSavantbarRowPrices({} as SavantbarVinFields)).toEqual({
      price_bottle: null,
      price_glass: null,
    });
  });
});

describe("active Savantbar filters", () => {
  it("requires Listed === true for Vin", () => {
    expect(isActiveSavantbarVin({ Listed: true } as SavantbarVinFields)).toBe(true);
    expect(isActiveSavantbarVin({ Listed: false } as SavantbarVinFields)).toBe(false);
    expect(isActiveSavantbarVin({} as SavantbarVinFields)).toBe(false);
    expect(
      isActiveSavantbarVin({ Listed: true, Delisted: true } as SavantbarVinFields),
    ).toBe(false);
  });

  it("excludes Delisted Other rows", () => {
    expect(isActiveSavantbarOther({ Delisted: true } as SavantbarOtherFields)).toBe(false);
    expect(isActiveSavantbarOther({ Delisted: false } as SavantbarOtherFields)).toBe(true);
    expect(isActiveSavantbarOther({} as SavantbarOtherFields)).toBe(true);
  });
});
