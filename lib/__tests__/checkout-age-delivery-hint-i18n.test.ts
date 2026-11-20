import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/messages";

describe("checkout.ageDeliveryIdHint uses {age} from config", () => {
  it("interpolates required age for SV and EN", () => {
    expect(
      translate("sv", "checkout.ageDeliveryIdHint", { age: 20 }),
    ).toBe(
      "Du måste ha fyllt 20 år. Leveransen lämnas bara ut mot legitimation till någon som fyllt 20.",
    );
    expect(
      translate("en", "checkout.ageDeliveryIdHint", { age: 20 }),
    ).toBe(
      "You must be 20 or older. Delivery is only handed over against ID to someone aged 20 or older.",
    );
    expect(
      translate("sv", "checkout.ageDeliveryIdHint", { age: 21 }),
    ).toContain("21");
    expect(
      translate("en", "checkout.ageDeliveryIdHint", { age: 21 }),
    ).toContain("21");
  });

  it("keeps placeholder when age is omitted (call sites must pass age)", () => {
    expect(translate("sv", "checkout.ageDeliveryIdHint")).toContain("{age}");
    expect(translate("en", "checkout.ageDeliveryIdHint")).toContain("{age}");
  });
});
