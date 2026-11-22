import { describe, expect, it } from "vitest";
import {
  buildCheckoutEditDeliveryDraft,
  seedProfileModalFormFromDelivery,
} from "@/lib/checkout/profile-modal-form-seed";
import type { ZoneDeliveryLines } from "@/lib/checkout/user-zone-delivery-template";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const guestLines = (): ZoneDeliveryLines => ({
  street: "Drottninggatan 1",
  city: "Stockholm",
  postal: "11151",
  countryCode: "SE",
  regionCode: null,
  fullName: "Gast Andra Syntetisk",
  phone: "0701234567",
  email: "gast.andra@example.com",
});

describe("seedProfileModalFormFromDelivery (guest Ändra)", () => {
  it("prefills name, email, phone and address from checkout delivery", () => {
    const seed = seedProfileModalFormFromDelivery(guestLines());
    expect(seed.full_name).toBe("Gast Andra Syntetisk");
    expect(seed.email).toBe("gast.andra@example.com");
    expect(seed.phone).toBe("0701234567");
    expect(seed.address).toBe("Drottninggatan 1");
    expect(seed.city).toBe("Stockholm");
    expect(seed.postal_code).toBe("11151");
    expect(seed.country).toBe("SE");
  });

  it("does not invent blank contact when lines are missing", () => {
    const seed = seedProfileModalFormFromDelivery(null, "41101");
    expect(seed.full_name).toBe("");
    expect(seed.postal_code).toBe("41101");
  });

  it("normalizes spaced postcodes", () => {
    expect(
      seedProfileModalFormFromDelivery({
        ...guestLines(),
        postal: "411 01",
      }).postal_code,
    ).toBe("41101");
  });
});

describe("buildCheckoutEditDeliveryDraft", () => {
  it("prefers effective/draft contact over a zone row missing contact", () => {
    const zoneOnlyAddress: ZoneDeliveryLines = {
      street: "Zonegatan 9",
      city: "Stockholm",
      postal: "11151",
      countryCode: "SE",
      regionCode: null,
      fullName: null,
      phone: null,
      email: null,
    };
    const draft = buildCheckoutEditDeliveryDraft({
      zoneLines: zoneOnlyAddress,
      deliveryDraft: null,
      effectiveDelivery: guestLines(),
      profile: null,
    });
    expect(draft.fullName).toBe("Gast Andra Syntetisk");
    expect(draft.email).toBe("gast.andra@example.com");
    expect(draft.phone).toBe("0701234567");
    // Prefer draft/effective street when present
    expect(draft.street).toBe("Drottninggatan 1");
  });
});

describe("checkout guest Ändra wiring", () => {
  it("passes guestMode + checkoutDelivery into ProfileInfoModal", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/checkout/checkout-client.tsx"),
      "utf8",
    );
    expect(src).toMatch(/guestMode=\{platformOpen\}/);
    expect(src).toMatch(/checkoutDelivery=\{effectiveDelivery\}/);
    expect(src).toMatch(/buildCheckoutEditDeliveryDraft/);
  });

  it("ProfileInfoModal never shows profileAddressIncomplete in guestMode", () => {
    const src = readFileSync(
      resolve(
        process.cwd(),
        "components/checkout/profile-info-modal.tsx",
      ),
      "utf8",
    );
    expect(src).toMatch(/guestMode/);
    expect(src).toMatch(
      /guestMode\s*\?\s*t\("checkout\.fieldRequired"\)\s*:\s*t\("checkout\.profileAddressIncomplete"\)/,
    );
    expect(src).toMatch(/if \(guestMode\) \{\s*onProfileSaved/);
  });
});
