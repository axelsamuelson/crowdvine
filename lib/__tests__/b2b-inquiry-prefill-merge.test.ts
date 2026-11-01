import { describe, expect, it } from "vitest";
import { mergeB2bInquiryInputWithPrefill } from "@/lib/b2b/inquiry-prefill";
import { validateB2bInquiryForm } from "@/lib/b2b/inquiry-validation";

const baseLines = [{ wineId: "w1", quantity: 1, wineTitle: "Vin" }];

const fullPrefill = {
  companyName: "Profile AB",
  organizationNumber: "556677-8899",
  contactName: "Ada Lovelace",
  email: "ada@example.com",
  phone: "0701234567",
  deliveryAddress: "Hornsgatan 1",
  postalCode: "11846",
  city: "Stockholm",
};

describe("mergeB2bInquiryInputWithPrefill", () => {
  it("fills empty form fields from prefill", () => {
    const merged = mergeB2bInquiryInputWithPrefill(
      {
        companyName: "",
        organizationNumber: "",
        contactName: "",
        email: "",
        phone: "",
        deliveryAddress: "",
        postalCode: "",
        city: "",
        website: "",
        lines: baseLines,
      },
      fullPrefill,
    );
    expect(merged.companyName).toBe("Profile AB");
    expect(merged.email).toBe("ada@example.com");
    expect(merged.city).toBe("Stockholm");
    const validated = validateB2bInquiryForm(merged);
    expect(validated.ok).toBe(true);
  });

  it("prefers non-empty form values over prefill", () => {
    const merged = mergeB2bInquiryInputWithPrefill(
      {
        companyName: "Edited AB",
        organizationNumber: "556677-8899",
        contactName: "Ada Lovelace",
        email: "other@example.com",
        phone: "",
        deliveryAddress: "Hornsgatan 1",
        postalCode: "11846",
        city: "Stockholm",
        website: "",
        lines: baseLines,
      },
      fullPrefill,
    );
    expect(merged.companyName).toBe("Edited AB");
    expect(merged.email).toBe("other@example.com");
    expect(merged.phone).toBe("0701234567");
  });

  it("leaves input unchanged when prefill is null", () => {
    const input = {
      companyName: "",
      organizationNumber: "556677-8899",
      contactName: "Ada",
      email: "ada@example.com",
      deliveryAddress: "Gatan 1",
      postalCode: "11846",
      city: "Stockholm",
      website: "",
      lines: baseLines,
    };
    expect(mergeB2bInquiryInputWithPrefill(input, null)).toEqual(input);
  });
});
