import { describe, expect, it } from "vitest";
import {
  isValidEmail,
  isValidPhone,
  isValidSwedishOrgNumber,
  isValidSwedishPostalCode,
  validateB2bInquiryForm,
} from "@/lib/b2b/inquiry-validation";
import {
  getB2bInquiryNotifyEmail,
  getDirtywineCheckoutMode,
  B2B_PRODUCER_ORDERS_ENABLED,
} from "@/lib/b2b/flags";
import { listB2bInquiryCustomerFacingSvTexts } from "@/lib/b2b/inquiry-copy";

describe("b2b inquiry validation", () => {
  it("accepts swedish org numbers with optional hyphen", () => {
    expect(isValidSwedishOrgNumber("556677-8899")).toBe(true);
    expect(isValidSwedishOrgNumber("5566778899")).toBe(true);
    expect(isValidSwedishOrgNumber("556677")).toBe(false);
  });

  it("validates postal code, email, phone", () => {
    expect(isValidSwedishPostalCode("118 46")).toBe(true);
    expect(isValidSwedishPostalCode("11846")).toBe(true);
    expect(isValidSwedishPostalCode("1184")).toBe(false);
    expect(isValidEmail("a@b.se")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidPhone("+46701234567")).toBe(true);
    expect(isValidPhone("070-123 45 67")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });

  it("rejects honeypot fills as honeypot error", () => {
    const result = validateB2bInquiryForm({
      companyName: "Test AB",
      organizationNumber: "556677-8899",
      contactName: "Ada",
      email: "ada@example.com",
      phone: "0701234567",
      deliveryAddress: "Gatan 1",
      postalCode: "11846",
      desiredDeliveryDate: "2026-12-01",
      website: "http://spam.example",
      lines: [{ wineId: "w1", quantity: 6 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("honeypot");
  });

  it("normalizes a valid inquiry", () => {
    const result = validateB2bInquiryForm({
      companyName: "  Test AB ",
      organizationNumber: "556677-8899",
      contactName: "Ada",
      email: "Ada@Example.COM",
      phone: "0701234567",
      deliveryAddress: "Gatan 1",
      postalCode: "118 46",
      desiredDeliveryDate: "2026-12-01",
      message: "  hej  ",
      website: "",
      lines: [
        {
          wineId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          quantity: 6,
          wineTitle: "Vin",
          unitPriceCents: 12000,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.email).toBe("ada@example.com");
      expect(result.value.postalCode).toBe("11846");
      expect(result.value.message).toBe("hej");
      expect(result.value.lines).toHaveLength(1);
    }
  });
});

describe("b2b inquiry flags", () => {
  it("keeps producer orders disabled", () => {
    expect(B2B_PRODUCER_ORDERS_ENABLED).toBe(false);
  });

  it("defaults checkout mode to checkout when env unset", () => {
    const prevPublic = process.env.NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE;
    const prev = process.env.DIRTYWINE_CHECKOUT_MODE;
    delete process.env.NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE;
    delete process.env.DIRTYWINE_CHECKOUT_MODE;
    expect(getDirtywineCheckoutMode()).toBe("checkout");
    if (prevPublic !== undefined) {
      process.env.NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE = prevPublic;
    }
    if (prev !== undefined) process.env.DIRTYWINE_CHECKOUT_MODE = prev;
  });

  it("defaults notify email to axel@dirtywine.se", () => {
    const prev = process.env.B2B_INQUIRY_NOTIFY_EMAIL;
    delete process.env.B2B_INQUIRY_NOTIFY_EMAIL;
    expect(getB2bInquiryNotifyEmail()).toBe("axel@dirtywine.se");
    if (prev !== undefined) process.env.B2B_INQUIRY_NOTIFY_EMAIL = prev;
  });
});

describe("b2b inquiry copy for legal review", () => {
  it("exposes swedish customer-facing strings", () => {
    const texts = listB2bInquiryCustomerFacingSvTexts();
    expect(texts).toContain("Skicka förfrågan");
    expect(texts).toContain(
      "Tack för din förfrågan. Vi återkommer med bekräftelse och faktura.",
    );
    expect(texts.length).toBeGreaterThan(10);
  });
});
