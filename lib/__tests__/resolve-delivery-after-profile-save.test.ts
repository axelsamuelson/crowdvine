import { describe, expect, it } from "vitest";
import {
  profileAddressToDeliveryLines,
  resolveDeliveryAfterProfileSave,
  resolveEffectiveCheckoutDelivery,
} from "@/lib/checkout/resolve-delivery-after-profile-save";
import type { UserZoneAddressTemplate } from "@/lib/checkout/user-zone-delivery-template";

function zoneRow(
  overrides: Partial<UserZoneAddressTemplate> = {},
): UserZoneAddressTemplate {
  return {
    id: "uza-1",
    user_id: "user-1",
    geo_zone_id: "geo-stockholm",
    full_name: "Camille Test",
    phone: "0701234567",
    email: "camille@example.com",
    address_line1: "Drottninggatan 12",
    address_line2: null,
    city: "Stockholm",
    postal_code: "11151",
    country_code: "SE",
    region_code: null,
    ...overrides,
  };
}

describe("profileAddressToDeliveryLines", () => {
  it("normalizes spaced SE postal codes", () => {
    const lines = profileAddressToDeliveryLines({
      address: "Hjalmar Lundbohmsvägen 20",
      city: "Kiruna",
      postal_code: "981 31",
      countryCode: "SE",
      full_name: "Camille Test",
      phone: "0701234567",
      email: "camille@example.com",
    });
    expect(lines).toEqual({
      street: "Hjalmar Lundbohmsvägen 20",
      city: "Kiruna",
      postal: "98131",
      countryCode: "SE",
      regionCode: null,
      fullName: "Camille Test",
      phone: "0701234567",
      email: "camille@example.com",
    });
  });

  it("returns null when street/city/postal incomplete", () => {
    expect(
      profileAddressToDeliveryLines({
        address: "Drottninggatan 12",
        city: "Stockholm",
        postal_code: "",
        countryCode: "SE",
      }),
    ).toBeNull();
  });
});

describe("resolveDeliveryAfterProfileSave (root cause)", () => {
  it("stale zone row must be overwritten so checkout shows Kiruna after save", () => {
    const saved = profileAddressToDeliveryLines({
      address: "Hjalmar Lundbohmsvägen 20",
      city: "Kiruna",
      postal_code: "98131",
      countryCode: "SE",
      full_name: "Camille Test",
      phone: "0701234567",
      email: "camille@example.com",
    })!;

    const resolved = resolveDeliveryAfterProfileSave({
      zoneAddressRow: zoneRow(),
      savedLines: saved,
    });

    expect(resolved.needsZoneAddressPersist).toBe(true);
    expect(resolved.nextDeliveryDraft).toBeNull();
    expect(resolved.nextZoneAddressRow?.postal_code).toBe("98131");
    expect(resolved.nextZoneAddressRow?.city).toBe("Kiruna");
    expect(resolved.nextZoneAddressRow?.address_line1).toBe(
      "Hjalmar Lundbohmsvägen 20",
    );

    // Checkout precedence: zone wins — after alignment UI shows Kiruna, not 11151.
    const shown = resolveEffectiveCheckoutDelivery(
      resolved.nextZoneAddressRow,
      resolved.nextDeliveryDraft,
    );
    expect(shown?.postal).toBe("98131");
    expect(shown?.city).toBe("Kiruna");
  });

  it("without a zone row, draft becomes source of truth (guest / new session)", () => {
    const saved = profileAddressToDeliveryLines({
      address: "Hjalmar Lundbohmsvägen 20",
      city: "Kiruna",
      postal_code: "981 31",
      countryCode: "SE",
    })!;

    const resolved = resolveDeliveryAfterProfileSave({
      zoneAddressRow: null,
      savedLines: saved,
    });

    expect(resolved.needsZoneAddressPersist).toBe(false);
    expect(resolved.nextZoneAddressRow).toBeNull();
    expect(resolved.nextDeliveryDraft?.postal).toBe("98131");

    const shown = resolveEffectiveCheckoutDelivery(
      resolved.nextZoneAddressRow,
      resolved.nextDeliveryDraft,
    );
    expect(shown?.postal).toBe("98131");
  });

  it("reproduces the bug: stale zone shadows draft when profile save is not applied", () => {
    const staleZone = zoneRow();
    const draftOnly = profileAddressToDeliveryLines({
      address: "Hjalmar Lundbohmsvägen 20",
      city: "Kiruna",
      postal_code: "98131",
      countryCode: "SE",
    });

    // Pre-fix behaviour: set draft from profile, leave zone untouched.
    const shown = resolveEffectiveCheckoutDelivery(staleZone, draftOnly);
    expect(shown?.postal).toBe("11151");
    expect(shown?.city).toBe("Stockholm");
  });

  it("same location still persists when contact fields change", () => {
    const saved = profileAddressToDeliveryLines({
      address: "Drottninggatan 12",
      city: "Stockholm",
      postal_code: "11151",
      countryCode: "SE",
      full_name: "Ny Namn",
      phone: "0709998877",
      email: "ny@example.com",
    })!;

    const resolved = resolveDeliveryAfterProfileSave({
      zoneAddressRow: zoneRow(),
      savedLines: saved,
    });

    expect(resolved.needsZoneAddressPersist).toBe(true);
    expect(resolved.nextZoneAddressRow?.full_name).toBe("Ny Namn");
    expect(resolved.nextZoneAddressRow?.postal_code).toBe("11151");
  });
});
