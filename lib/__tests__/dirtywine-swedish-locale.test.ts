import { describe, expect, it } from "vitest";

import {
  FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED,
  isUiLocalizationEnabled,
} from "@/lib/localization";
import {
  availableAppLocalesForZone,
  clampAppLocaleForZone,
} from "@/lib/i18n/locale-policy";

const seZone = {
  countryCode: "SE",
  marketCode: "EU",
};

describe("Dirtywine Swedish-only UI locale", () => {
  it("disables the language switcher on dirtywine.se", () => {
    expect(isUiLocalizationEnabled("dirtywine.se")).toBe(false);
    expect(isUiLocalizationEnabled("www.dirtywine.se")).toBe(false);
    expect(isUiLocalizationEnabled("pactwines.com")).toBe(true);
    expect(isUiLocalizationEnabled("localhost")).toBe(true);
    expect(
      isUiLocalizationEnabled("localhost", {
        get: (k) => (k === "b2b" ? "1" : null),
      }),
    ).toBe(false);
  });

  it("fixes Dirtywine to Swedish when localization is off", () => {
    expect(FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED).toBe("sv");
    expect(availableAppLocalesForZone(seZone, false)).toEqual(["sv"]);
    expect(clampAppLocaleForZone("en", seZone, false)).toBe("sv");
    expect(clampAppLocaleForZone("sv", seZone, false)).toBe("sv");
  });

  it("keeps bilingual locales for PACT (localization on)", () => {
    expect(availableAppLocalesForZone(seZone, true)).toEqual(["en", "sv"]);
    expect(clampAppLocaleForZone("en", seZone, true)).toBe("en");
  });
});
