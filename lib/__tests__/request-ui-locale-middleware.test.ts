import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";
import { resolveRequestUiLocale } from "@/lib/i18n/request-ui-locale";
import { applyLocalePolicyToContext } from "@/lib/shopping-context/apply-locale-policy";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";

describe("resolveRequestUiLocale (middleware contract)", () => {
  it("no lang → same as path-only locale; cookie persist only when path has a pair", () => {
    for (const pathname of [
      "/",
      "/en",
      "/vin",
      "/wine",
      "/villkor",
      "/terms",
      "/reservation-extension/confirm",
      "/pallet-close/cancel",
      "/checkout",
    ]) {
      const without = resolveRequestUiLocale(pathname);
      const withEmpty = resolveRequestUiLocale(pathname, "");
      const withNoise = resolveRequestUiLocale(pathname, "?token=abc&utm_source=x");
      const pathOnly = localeFromShopPath(pathname);

      expect(without).toEqual({
        pathLocale: pathOnly,
        queryLocale: null,
        uiLocale: pathOnly,
        shouldPersistLocaleCookie: pathOnly != null,
      });
      expect(withEmpty).toEqual(without);
      expect(withNoise).toEqual(without);
    }
  });

  it("lang=sv on locale-neutral path → UI sv, does not persist cookie", () => {
    const r = resolveRequestUiLocale(
      "/reservation-extension/confirm",
      "?token=abc&lang=sv",
    );
    expect(r).toEqual({
      pathLocale: null,
      queryLocale: "sv",
      uiLocale: "sv",
      shouldPersistLocaleCookie: false,
    });
  });

  it("lang=en on locale-neutral path → UI en, does not persist cookie", () => {
    const r = resolveRequestUiLocale("/pallet-close/cancel", "lang=en");
    expect(r).toEqual({
      pathLocale: null,
      queryLocale: "en",
      uiLocale: "en",
      shouldPersistLocaleCookie: false,
    });
  });

  it("invalid lang value is ignored (same as no lang)", () => {
    const base = resolveRequestUiLocale("/reservation-extension/confirm");
    expect(resolveRequestUiLocale("/reservation-extension/confirm", "?lang=nope")).toEqual(
      base,
    );
    expect(resolveRequestUiLocale("/reservation-extension/confirm", "?lang=")).toEqual(
      base,
    );
    expect(resolveRequestUiLocale("/reservation-extension/confirm", "?lang=fr")).toEqual(
      base,
    );
  });

  it("path + lang conflict → path wins; cookie still path-only", () => {
    const vinEn = resolveRequestUiLocale("/vin", "?lang=en");
    expect(vinEn.pathLocale).toBe("sv");
    expect(vinEn.queryLocale).toBe("en");
    expect(vinEn.uiLocale).toBe("sv");
    expect(vinEn.shouldPersistLocaleCookie).toBe(true);

    const wineSv = resolveRequestUiLocale("/wine", "?lang=sv");
    expect(wineSv.pathLocale).toBe("en");
    expect(wineSv.queryLocale).toBe("sv");
    expect(wineSv.uiLocale).toBe("en");
    expect(wineSv.shouldPersistLocaleCookie).toBe(true);

    const termsSv = resolveRequestUiLocale("/terms", "?lang=sv");
    expect(termsSv.uiLocale).toBe("en");
    expect(termsSv.shouldPersistLocaleCookie).toBe(true);

    const villkorEn = resolveRequestUiLocale("/villkor", "?lang=en");
    expect(villkorEn.uiLocale).toBe("sv");
    expect(villkorEn.shouldPersistLocaleCookie).toBe(true);
  });
});

describe("middleware.ts wiring", () => {
  const src = readFileSync(resolve(process.cwd(), "middleware.ts"), "utf8");

  it("uses resolveRequestUiLocale and only persists cookie when shouldPersistLocaleCookie", () => {
    expect(src).toMatch(/resolveRequestUiLocale/);
    expect(src).toMatch(/shouldPersistLocaleCookie/);
    expect(src).toMatch(/cookies\.set\(LOCALE_COOKIE,\s*pathLocale/);
    // Must not treat query lang as the cookie source.
    expect(src).not.toMatch(
      /cookies\.set\(LOCALE_COOKIE,\s*uiLocale/,
    );
  });
});

describe("?lang= does not change market/currency", () => {
  it("applyLocalePolicy keeps currency from zone/market when UI locale flips", () => {
    const base = fallbackShoppingContext();
    const asSv = applyLocalePolicyToContext({ ...base, locale: "sv" });
    const asEn = applyLocalePolicyToContext({ ...base, locale: "en" });

    expect(asSv.currencyCode).toBe(asEn.currencyCode);
    expect(asSv.market.marketCode).toBe(asEn.market.marketCode);
    expect(asSv.activeZone.geoZoneId).toBe(asEn.activeZone.geoZoneId);
    expect(asSv.locale).toBe("sv");
    expect(asEn.locale).toBe("en");
  });
});
