import { describe, expect, it } from "vitest";

import { producerDisplayName } from "@/lib/producer-display-name";
import {
  producerShopMetaDescription,
  producerShopPageTitle,
} from "@/lib/seo/producer-shop-metadata";
import { producerShopPageHeading } from "@/lib/i18n/producer-shop-page";

describe("producerDisplayName", () => {
  it("returns display_name when it is set", () => {
    expect(
      producerDisplayName({
        name: "Domaine Romaneaux-Destezet",
        display_name: "Hervé Souhaut",
      }),
    ).toBe("Hervé Souhaut");
  });

  it("returns the legal name when display_name is empty", () => {
    expect(
      producerDisplayName({
        name: "Clos Fantine",
        display_name: "  ",
      }),
    ).toBe("Clos Fantine");
  });
});

describe("producer shop titles", () => {
  it("uses the display name with an en dash and no legal name", () => {
    expect(
      producerShopPageTitle(
        "Domaine Romaneaux-Destezet",
        "sv",
        "Hervé Souhaut",
      ),
    ).toBe("Hervé Souhaut – naturviner | PACT");
    expect(
      producerShopPageTitle(
        "Domaine Romaneaux-Destezet",
        "en",
        "Hervé Souhaut",
      ),
    ).toBe("Hervé Souhaut – natural wines | PACT");
    expect(
      producerShopPageHeading(
        "Domaine Romaneaux-Destezet",
        "sv",
        "Hervé Souhaut",
      ),
    ).toBe("Viner från Hervé Souhaut");
    expect(
      producerShopPageHeading(
        "Domaine Romaneaux-Destezet",
        "en",
        "Hervé Souhaut",
      ),
    ).toBe("Wines from Hervé Souhaut");
  });

  it("keeps the legal name when there is no display name", () => {
    expect(producerShopPageTitle("Clos Fantine", "sv")).toBe(
      "Clos Fantine – naturviner | PACT",
    );
  });
});

describe("producer shop meta description", () => {
  it("mentions the legal name once when it differs from the display name", () => {
    expect(
      producerShopMetaDescription("sv", {
        producerName: "Domaine Romaneaux-Destezet",
        displayName: "Hervé Souhaut",
        region: "Rhône",
      }),
    ).toBe(
      "Naturviner från Hervé Souhaut (Domaine Romaneaux-Destezet), Rhône. Hemleverans i Sverige.",
    );
    expect(
      producerShopMetaDescription("en", {
        producerName: "Domaine Romaneaux-Destezet",
        displayName: "Hervé Souhaut",
        region: "Rhône",
      }),
    ).toBe(
      "Natural wines from Hervé Souhaut (Domaine Romaneaux-Destezet), Rhône. Home delivery in Sweden.",
    );
  });

  it("omits the parenthesis when there is no separate display name", () => {
    expect(
      producerShopMetaDescription("sv", {
        producerName: "Clos Fantine",
        region: "Languedoc",
      }),
    ).toBe("Naturviner från Clos Fantine, Languedoc. Hemleverans i Sverige.");
  });
});
