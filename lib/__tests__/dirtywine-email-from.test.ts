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
  it("omits address and Stockholm when DIRTYWINE_LEGAL_ADDRESS is unset", () => {
    delete process.env.DIRTYWINE_LEGAL_ADDRESS;
    expect(getDirtywineLegalAddress()).toBeNull();
    const footer = getDirtywineInquiryEmailFooterPlain();
    expect(footer).toBe(
      `${DIRTYWINE_BRAND_NAME} drivs av Axel Samuelson (enskild firma) · axel@dirtywine.se · Integritetspolicy · Du får det här mejlet eftersom du skickade en förfrågan på dirtywine.se.`,
    );
    expect(footer).not.toContain("[ADRESS]");
    expect(footer).not.toContain("Stockholm");
    expect(footer).not.toContain("EURPACT");
  });

  it("inserts address and Stockholm when env is set", () => {
    process.env.DIRTYWINE_LEGAL_ADDRESS = "Testgatan 1";
    const footer = getDirtywineInquiryEmailFooterPlain();
    expect(footer).toContain(
      `${DIRTYWINE_BRAND_NAME} drivs av Axel Samuelson (enskild firma), Testgatan 1, Stockholm ·`,
    );
    expect(footer).not.toContain("[ADRESS]");
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
    expect(built.text).toContain("Testvin");
    expect(built.text).toContain("6 flaskor");
    expect(built.text).not.toContain("[ADRESS]");
    expect(built.text).not.toContain("Stockholm");
    expect(built.html).toContain("6 flaskor");
    expect(built.html).toMatch(/padding:[^;]*16px/);
    expect(built.html).toContain("white-space:nowrap");
    expect(built.html).not.toContain(" × ");
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
