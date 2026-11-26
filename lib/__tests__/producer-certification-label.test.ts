import { describe, expect, it } from "vitest";

import {
  formatProducerCertification,
  formatProducerCertificationLabels,
  formatProducerLapsedOrganicFarming,
  formatProducerOrganicAndBiodynamicFarming,
  producerCertificationRegistryUrl,
} from "@/lib/product/wine-enrichment";

describe("producerCertificationRegistryUrl", () => {
  it("accepts http(s) registry links", () => {
    expect(
      producerCertificationRegistryUrl("https://www.demeter.fr/foo"),
    ).toBe("https://www.demeter.fr/foo");
    expect(producerCertificationRegistryUrl(" http://example.com/x ")).toBe(
      "http://example.com/x",
    );
  });

  it("rejects empty or non-http values", () => {
    expect(producerCertificationRegistryUrl(null)).toBeNull();
    expect(producerCertificationRegistryUrl("")).toBeNull();
    expect(producerCertificationRegistryUrl("   ")).toBeNull();
    expect(producerCertificationRegistryUrl("ftp://example.com")).toBeNull();
    expect(producerCertificationRegistryUrl("not-a-url")).toBeNull();
  });
});

describe("formatProducerCertificationLabels", () => {
  it("uses farming labels without a producer qualifier when unverified", () => {
    expect(
      formatProducerCertificationLabels("biodynamic_certified", "en"),
    ).toEqual([
      {
        text: "Organic and biodynamic farming",
      },
    ]);
    expect(
      formatProducerCertificationLabels("biodynamic_certified", "sv"),
    ).toEqual([
      {
        text: "Ekologisk och biodynamisk odling",
      },
    ]);
    expect(formatProducerCertificationLabels("organic_certified", "en")).toEqual([
      { text: "Organic" },
    ]);
    expect(formatProducerCertificationLabels("organic_certified", "sv")).toEqual([
      { text: "Ekologiskt" },
    ]);
  });

  it("hides certification chips when organic certification has lapsed", () => {
    expect(
      formatProducerCertificationLabels("organic_certified", "en", {
        certificationLapsed: true,
      }),
    ).toEqual([]);
    expect(
      formatProducerCertificationLabels("organic_certified", "sv", {
        certificationLapsed: true,
        certificationVerifiedUrl: "https://example.com/should-ignore",
      }),
    ).toEqual([]);
    expect(formatProducerLapsedOrganicFarming("en")).toBe(
      "Organic farming; certification has lapsed",
    );
    expect(formatProducerLapsedOrganicFarming("sv")).toBe(
      "Ekologisk odling, certifieringen har upphört",
    );
  });

  it("exposes Mas Des Mesures-style organic + biodynamic farming copy", () => {
    expect(formatProducerOrganicAndBiodynamicFarming("en")).toBe(
      "Organic and biodynamic farming",
    );
    expect(formatProducerOrganicAndBiodynamicFarming("sv")).toBe(
      "Ekologisk och biodynamisk odling",
    );
  });

  it("uses Organic Certified with registry link when verified", () => {
    const url = "https://certificat.ecocert.com/entreprise/example";
    expect(
      formatProducerCertificationLabels("organic_certified", "en", {
        certificationVerifiedUrl: url,
      }),
    ).toEqual([{ text: "Organic Certified", href: url }]);
    expect(
      formatProducerCertificationLabels("organic_certified", "sv", {
        certificationVerifiedUrl: url,
      }),
    ).toEqual([{ text: "Ekologiskt certifierad", href: url }]);
  });

  it("shows organic Certified plus biodynamic according-to-producer when both apply", () => {
    const url = "https://bio.certipaq.solutions/certificats/fiche/56136/auge-vincent/";
    expect(
      formatProducerCertificationLabels("biodynamic_certified", "en", {
        certificationVerifiedUrl: url,
      }),
    ).toEqual([
      { text: "Organic Certified", href: url },
      { text: "Biodynamic" },
    ]);
    expect(
      formatProducerCertificationLabels("biodynamic_certified", "sv", {
        certificationVerifiedUrl: url,
      }),
    ).toEqual([
      { text: "Ekologiskt certifierad", href: url },
      { text: "Biodynamiskt" },
    ]);
  });

  it("labels Meigoon-style conversion with link, not Certified", () => {
    const url =
      "https://certificat.ecocert.com/entreprise/AFFACF70-4072-4674-842F-F1C730B01493";
    expect(
      formatProducerCertificationLabels("organic_certified", "en", {
        certificationVerifiedUrl: url,
        certificationInConversion: true,
      }),
    ).toEqual([{ text: "Organic (in conversion)", href: url }]);
    expect(
      formatProducerCertificationLabels("organic_certified", "sv", {
        certificationVerifiedUrl: url,
        certificationInConversion: true,
      }),
    ).toEqual([{ text: "Ekologiskt (under omställning)", href: url }]);
  });

  it("never presents natural as Certified/Certifierad", () => {
    expect(
      formatProducerCertificationLabels("natural", "en", {
        certificationVerifiedUrl: "https://example.com/should-ignore",
      }),
    ).toEqual([{ text: "Natural" }]);
    expect(formatProducerCertificationLabels("natural", "sv")).toEqual([
      { text: "Naturvin" },
    ]);
    expect(formatProducerCertification("natural", "en")).not.toMatch(
      /certified/i,
    );
  });

  it("joins compact labels for hero/editorial", () => {
    expect(formatProducerCertification("organic_certified", "en")).toBe(
      "Organic",
    );
    expect(
      formatProducerCertification("biodynamic_certified", "en", {
        certificationVerifiedUrl: "https://example.com/organic",
      }),
    ).toBe(
      "Organic Certified · Biodynamic",
    );
  });
});
