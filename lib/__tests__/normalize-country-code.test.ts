import { describe, expect, it } from "vitest";

import {
  buildProducerInsert,
  buildProducerPatch,
  InvalidProducerCountryError,
  producerRowToApi,
} from "@/lib/catalog-mappers";
import { normalizeCountryCode } from "@/lib/countries";

describe("normalizeCountryCode", () => {
  it("accepts ISO codes that exist in countries", () => {
    expect(normalizeCountryCode("fr")).toBe("FR");
    expect(normalizeCountryCode("  ES ")).toBe("ES");
    expect(normalizeCountryCode("US")).toBe("US");
  });

  it("maps known English and Swedish names", () => {
    expect(normalizeCountryCode("France")).toBe("FR");
    expect(normalizeCountryCode("france")).toBe("FR");
    expect(normalizeCountryCode("Frankrike")).toBe("FR");
    expect(normalizeCountryCode("Spain")).toBe("ES");
    expect(normalizeCountryCode("Spanien")).toBe("ES");
    expect(normalizeCountryCode("Italy")).toBe("IT");
    expect(normalizeCountryCode("Italien")).toBe("IT");
    expect(normalizeCountryCode("Österrike")).toBe("AT");
    expect(normalizeCountryCode("Schweiz")).toBe("CH");
  });

  it("returns null for empty or unknown values", () => {
    expect(normalizeCountryCode("")).toBeNull();
    expect(normalizeCountryCode("   ")).toBeNull();
    expect(normalizeCountryCode("XX")).toBeNull();
    expect(normalizeCountryCode("Narnia")).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
    expect(normalizeCountryCode(12)).toBeNull();
  });
});

describe("producer country writes", () => {
  it("defaults a missing catalog country to FR", () => {
    const row = buildProducerInsert({ name: "Test", region: "Languedoc" });
    expect(row.country_code).toBe("FR");
  });

  it("stores France as FR", () => {
    const row = buildProducerInsert({
      name: "Test",
      region: "Languedoc",
      country: "France",
    });
    expect(row.country_code).toBe("FR");
  });

  it("rejects an unknown catalog country", () => {
    expect(() =>
      buildProducerInsert({ name: "Test", region: "Languedoc", country: "XX" }),
    ).toThrow(InvalidProducerCountryError);
    expect(() => buildProducerPatch({ country: "XX" })).toThrow(
      InvalidProducerCountryError,
    );
  });

  it("maps a catalog patch name to an ISO code", () => {
    expect(buildProducerPatch({ country: "Spanien" }).country_code).toBe("ES");
  });

  it("reads the Swedish display name separately from the ISO code", () => {
    const api = producerRowToApi({
      id: "1",
      name: "Test",
      region: "Languedoc",
      country: "Frankrike",
      country_code: "FR",
    });
    expect(api.country).toBe("Frankrike");
    expect(api.country_code).toBe("FR");
  });

  it("exposes Swedish and English bios separately without EN falling back to SV", () => {
    const api = producerRowToApi({
      id: "1",
      name: "Test",
      region: "Languedoc",
      country: "Frankrike",
      country_code: "FR",
      short_description: { sv: "Kort SV", en: "Short EN" },
      bio_long: { sv: "Lång SV" },
    });
    expect(api.bio_short).toBe("Kort SV");
    expect(api.bio_short_en).toBe("Short EN");
    expect(api.bio_long).toBe("Lång SV");
    expect(api.bio_long_en).toBeNull();
  });

  it("patches English bios without overwriting Swedish JSONB locales", () => {
    const patch = buildProducerPatch(
      { bio_short_en: "Short EN", bio_long_en: "Long EN" },
      {
        short_description: { sv: "Kort SV" },
        bio_long: { sv: "Lång SV" },
      },
    );
    expect(patch.short_description).toEqual({ sv: "Kort SV", en: "Short EN" });
    expect(patch.bio_long).toEqual({ sv: "Lång SV", en: "Long EN" });
  });

  it("clears only the English bio locale when null is passed", () => {
    const patch = buildProducerPatch(
      { bio_short_en: null },
      { short_description: { sv: "Kort SV", en: "Short EN" } },
    );
    expect(patch.short_description).toEqual({ sv: "Kort SV" });
  });
});
