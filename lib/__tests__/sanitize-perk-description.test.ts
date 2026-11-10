import { describe, expect, it } from "vitest";
import {
  sanitizeCustomerPerkDescription,
  sanitizeCustomerPerks,
} from "@/lib/membership/sanitize-perk-description";

describe("sanitizeCustomerPerkDescription", () => {
  it("strips permanent from founding discount copy (EN)", () => {
    expect(
      sanitizeCustomerPerkDescription("Founding Member permanent discount"),
    ).toBe("Founding Member discount");
  });

  it("strips Swedish ständig variants", () => {
    expect(
      sanitizeCustomerPerkDescription("Permanent grundarrabatt 15%"),
    ).toBe("grundarrabatt 15%");
    expect(
      sanitizeCustomerPerkDescription("Ständig medlemsrabatt"),
    ).toBe("medlemsrabatt");
  });

  it("leaves unrelated perk copy unchanged", () => {
    expect(
      sanitizeCustomerPerkDescription("Founding Member invite quota"),
    ).toBe("Founding Member invite quota");
  });

  it("maps perk arrays for membership APIs", () => {
    const out = sanitizeCustomerPerks([
      {
        perk_type: "discount",
        perk_value: "15%",
        description: "Founding Member permanent discount",
      },
    ]);
    expect(out[0].description).toBe("Founding Member discount");
  });
});
