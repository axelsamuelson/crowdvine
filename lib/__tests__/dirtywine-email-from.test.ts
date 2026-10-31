import { afterEach, describe, expect, it } from "vitest";
import {
  DIRTYWINE_BRAND_NAME,
  DIRTYWINE_INQUIRY_FOLLOW_UP,
  getDirtywineInquiryEmailFooterPlain,
  getDirtywineLegalAddress,
} from "@/lib/b2b/brand";
import {
  DIRTYWINE_RESEND_FROM_DEFAULT,
  getDirtywineReplyTo,
  getDirtywineResendFrom,
} from "@/lib/b2b/email-from";
import {
  buildB2bInquiryCustomerEmail,
  buildB2bInquiryInternalNotify,
} from "@/lib/b2b/inquiry-emails";

const ENV_KEYS = [
  "DIRTYWINE_RESEND_FROM",
  "DIRTYWINE_RESEND_REPLY_TO",
  "DIRTYWINE_LEGAL_ADDRESS",
] as const;

const sampleValue = {
  companyName: "Test AB",
  organizationNumber: "556677-8899",
  contactName: "Ada",
  email: "ada@example.com",
  phone: "0701234567",
  deliveryAddress: "Gatan 1",
  postalCode: "11846",
  desiredDeliveryDate: "2026-12-01",
  message: null,
  lines: [
    {
      wineId: "w1",
      quantity: 6,
      wineTitle: "Testvin",
      unitPriceCents: 19000,
    },
  ],
};

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("getDirtywineResendFrom", () => {
  it("defaults to Dirtywine display name on pactwines.com (unverified dirtywine.se)", () => {
    delete process.env.DIRTYWINE_RESEND_FROM;
    expect(getDirtywineResendFrom()).toBe(DIRTYWINE_RESEND_FROM_DEFAULT);
    expect(getDirtywineResendFrom()).toBe(
      `${DIRTYWINE_BRAND_NAME} <noreply@pactwines.com>`,
    );
  });

  it("respects DIRTYWINE_RESEND_FROM override", () => {
    process.env.DIRTYWINE_RESEND_FROM = `${DIRTYWINE_BRAND_NAME} <noreply@dirtywine.se>`;
    expect(getDirtywineResendFrom()).toBe(
      `${DIRTYWINE_BRAND_NAME} <noreply@dirtywine.se>`,
    );
  });

  it("defaults reply-to to axel@dirtywine.se", () => {
    delete process.env.DIRTYWINE_RESEND_REPLY_TO;
    expect(getDirtywineReplyTo()).toBe("axel@dirtywine.se");
  });
});

describe("Dirtywine legal footer", () => {
  it("keeps [ADRESS] placeholder when DIRTYWINE_LEGAL_ADDRESS is unset", () => {
    delete process.env.DIRTYWINE_LEGAL_ADDRESS;
    expect(getDirtywineLegalAddress()).toBe("[ADRESS]");
    const footer = getDirtywineInquiryEmailFooterPlain();
    expect(footer).toContain(`${DIRTYWINE_BRAND_NAME} drivs av Axel Samuelson`);
    expect(footer).toContain("[ADRESS]");
    expect(footer).not.toContain("EURPACT");
  });

  it("inserts env address when set", () => {
    process.env.DIRTYWINE_LEGAL_ADDRESS = "Testgatan 1";
    expect(getDirtywineInquiryEmailFooterPlain()).toContain("Testgatan 1");
    expect(getDirtywineInquiryEmailFooterPlain()).not.toContain("[ADRESS]");
  });
});

describe("inquiry email builders", () => {
  it("customer email uses brand From, headline, lines, footer link", () => {
    const built = buildB2bInquiryCustomerEmail({ value: sampleValue });
    expect(built.from).toBe(`${DIRTYWINE_BRAND_NAME} <noreply@pactwines.com>`);
    expect(built.subject).toBe(
      `Tack, vi har fått din förfrågan – ${DIRTYWINE_BRAND_NAME}`,
    );
    expect(built.text).toContain(DIRTYWINE_INQUIRY_FOLLOW_UP);
    expect(built.text).toContain("Test AB");
    expect(built.text).toContain("2026-12-01");
    expect(built.text).toContain("Testvin × 6");
    expect(built.text).toContain("[ADRESS]");
    expect(built.html).toContain("Integritetspolicy");
    expect(built.html).toContain("https://dirtywine.se/integritetspolicy");
    expect(built.html).toContain("fe06af9d-ee01-418b-8b77-9d1b0c435bac.svg");
    expect(built.html).not.toContain("EURPACT");
    expect(built.html).not.toContain("arbetsdagar");
  });

  it("notify email uses Dirtywine From, absolute admin link, order value", () => {
    const built = buildB2bInquiryInternalNotify({
      inquiryId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      value: sampleValue,
    });
    expect(built.from).toBe(`${DIRTYWINE_BRAND_NAME} <noreply@pactwines.com>`);
    expect(built.subject).toContain("[B2B förfrågan] Test AB");
    expect(built.text).toContain("Ny B2B-förfrågan från dirtywine.se");
    expect(built.text).toMatch(/Admin: https?:\/\/.+\/admin\/b2b-inquiries/);
    expect(built.text).toContain("Ordervärde:");
    expect(built.text).toContain("exkl. moms");
    expect(built.html).toContain('href=');
    expect(built.html).toContain("/admin/b2b-inquiries");
  });
});
