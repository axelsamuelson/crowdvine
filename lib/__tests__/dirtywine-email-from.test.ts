import { afterEach, describe, expect, it } from "vitest";
import {
  DIRTYWINE_RESEND_FROM_DEFAULT,
  getDirtywineReplyTo,
  getDirtywineResendFrom,
} from "@/lib/b2b/email-from";
import {
  buildB2bInquiryCustomerEmail,
  buildB2bInquiryInternalNotify,
} from "@/lib/b2b/inquiry-emails";

const ENV_KEYS = ["DIRTYWINE_RESEND_FROM", "DIRTYWINE_RESEND_REPLY_TO"] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("getDirtywineResendFrom", () => {
  it("defaults to Dirtywine display name on pactwines.com (unverified dirtywine.se)", () => {
    delete process.env.DIRTYWINE_RESEND_FROM;
    expect(getDirtywineResendFrom()).toBe(DIRTYWINE_RESEND_FROM_DEFAULT);
    expect(getDirtywineResendFrom()).toBe("Dirtywine <noreply@pactwines.com>");
  });

  it("respects DIRTYWINE_RESEND_FROM override", () => {
    process.env.DIRTYWINE_RESEND_FROM = "Dirtywine <noreply@dirtywine.se>";
    expect(getDirtywineResendFrom()).toBe("Dirtywine <noreply@dirtywine.se>");
  });

  it("defaults reply-to to axel@dirtywine.se", () => {
    delete process.env.DIRTYWINE_RESEND_REPLY_TO;
    expect(getDirtywineReplyTo()).toBe("axel@dirtywine.se");
  });
});

describe("inquiry email builders", () => {
  it("customer email uses Dirtywine From and verbatim copy", () => {
    const built = buildB2bInquiryCustomerEmail({ locale: "sv" });
    expect(built.from).toBe("Dirtywine <noreply@pactwines.com>");
    expect(built.subject).toBe("Tack för din förfrågan – Dirtywine");
    expect(built.text).toContain(
      "Tack för din förfrågan. Vi återkommer med bekräftelse och faktura.",
    );
    expect(built.html).toContain("integritetspolicy");
  });

  it("notify email uses Dirtywine From", () => {
    const built = buildB2bInquiryInternalNotify({
      inquiryId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      value: {
        companyName: "Test AB",
        organizationNumber: "556677-8899",
        contactName: "Ada",
        email: "ada@example.com",
        phone: "0701234567",
        deliveryAddress: "Gatan 1",
        postalCode: "11846",
        desiredDeliveryDate: "2026-12-01",
        message: null,
        lines: [{ wineId: "w1", quantity: 6, wineTitle: "Vin", unitPriceCents: 100 }],
      },
    });
    expect(built.from).toBe("Dirtywine <noreply@pactwines.com>");
    expect(built.subject).toContain("[B2B förfrågan] Test AB");
    expect(built.text).toContain("Ny B2B-förfrågan från dirtywine.se");
  });
});
