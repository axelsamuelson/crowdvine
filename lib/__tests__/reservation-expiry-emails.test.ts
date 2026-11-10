import { describe, expect, it } from "vitest";
import {
  buildExtensionConfirmSuccessBody,
  buildStatusEmailHtml,
  buildStatusEmailText,
  EXTENSION_CONFIRM_PAGE_COPY,
  EXTENSION_CONFIRM_PAGE_ERROR_COPY,
  formatReservedAmountSek,
  statusEmailSubject,
  STATUS_FOOTER_EN,
  STATUS_FOOTER_SV,
} from "@/lib/reservations/expiry-emails";
import { formatOrderAmountSek } from "@/lib/email/order-email-chrome";

describe("pallet status email copy (Juliette / Margaux / Inès)", () => {
  it("Swedish status email — shared template, tills, amounts, footer once", () => {
    const text = buildStatusEmailText({
      locale: "sv",
      customerName: "Anna",
      orderId: "ord-1",
      bottlesOrdered: 120,
      bottlesNeeded: 270,
      amountSek: 1250,
      orderUrl: "https://pactwines.com/profile/reservations",
      cancelUrl: "https://pactwines.com/pallet-close/cancel?token=abc",
    });
    expect(statusEmailSubject("sv")).toBe("Pallen fylls fortfarande");
    expect(text).toContain("Din order ord-1 väntar fortfarande");
    expect(text).toContain("120 av 270 flaskor");
    expect(text).toContain("Du behöver inte göra något");
    expect(text).toContain(formatReservedAmountSek(1250, "sv"));
    expect(text).toContain("1\u202F250 kr");
    expect(text).toContain("tills pallen stänger");
    expect(text).not.toContain("fram till att pallen stänger");
    expect(text).toContain("Se din order");
    expect(text).toContain("https://pactwines.com/profile/reservations");
    expect(text).toContain("pallet-close/cancel?token=abc");
    expect(text).toContain(STATUS_FOOTER_SV);
    expect(text).toContain("reg.nr 17538270");
    expect(text).toContain("pactwines.com");
    expect(text).not.toContain("pact.wine");
    expect(text).not.toContain("PACT Points");
  });

  it("English status email — SEK prefix, EN footer, no Swedish", () => {
    const text = buildStatusEmailText({
      locale: "en",
      customerName: "Alex",
      orderId: "ord-1",
      bottlesOrdered: 120,
      bottlesNeeded: 270,
      amountSek: 1250,
      orderUrl: "https://pactwines.com/profile/reservations",
      cancelUrl: "https://pactwines.com/pallet-close/cancel?token=abc",
    });
    expect(statusEmailSubject("en")).toBe("Your pallet is still filling up");
    expect(text).toContain("still waiting for the pallet to fill");
    expect(text).toContain("You don't need to do anything");
    expect(text).toContain("cancel free of charge");
    expect(text).toContain("SEK 1,250");
    expect(text).toContain(STATUS_FOOTER_EN);
    expect(text).toContain("View your order");
    expect(text).not.toContain("Säljare");
    expect(text).not.toContain("pact.wine");
  });

  it("HTML uses Inès chrome (no black banner) and both CTAs", () => {
    const html = buildStatusEmailHtml({
      locale: "sv",
      customerName: "Anna",
      orderId: "ord-1",
      bottlesOrdered: 10,
      bottlesNeeded: 270,
      amountSek: 500,
      orderUrl: "https://pactwines.com/profile/reservations",
      cancelUrl: "https://pactwines.com/pallet-close/cancel?token=x",
    });
    expect(html).toContain("Pallen fylls fortfarande");
    expect(html).toContain("font-family:Geist");
    expect(html).toContain("border-radius:4px");
    expect(html).toContain("background:#0A0A0A");
    expect(html).toContain("Se din order");
    expect(html).toContain("Avbryt ordern");
    expect(html).not.toContain("background:#000;padding:28px");
    expect(html.match(/PACT · customer@pactwines\.com/g) ?? []).toHaveLength(0);
    expect(html).toContain("Tartu mnt 67/1-13b");
  });

  it("shows PACT Points line only when pointsUsed > 0", () => {
    const without = buildStatusEmailText({
      locale: "sv",
      customerName: "Anna",
      orderId: "ord-1",
      bottlesOrdered: 10,
      bottlesNeeded: 270,
      amountSek: 500,
      orderUrl: "https://pactwines.com/profile/reservations",
      cancelUrl: "https://pactwines.com/x",
      pointsUsed: 0,
    });
    expect(without).not.toContain("PACT Points");

    const withPts = buildStatusEmailText({
      locale: "sv",
      customerName: "Anna",
      orderId: "ord-1",
      bottlesOrdered: 10,
      bottlesNeeded: 270,
      amountSek: 500,
      orderUrl: "https://pactwines.com/profile/reservations",
      cancelUrl: "https://pactwines.com/x",
      pointsUsed: 150,
    });
    expect(withPts).toContain("150 PACT Points");
  });

  it("formatOrderAmountSek is shared SV/EN", () => {
    expect(formatOrderAmountSek(1250, "sv")).toBe("1\u202F250 kr");
    expect(formatOrderAmountSek(1250, "en")).toBe("SEK 1,250");
  });

  it("legacy extension confirm page shows exact fixed copy", () => {
    expect(EXTENSION_CONFIRM_PAGE_COPY.sv.title).toBe("Ingen åtgärd behövs");
    expect(buildExtensionConfirmSuccessBody({ locale: "sv" })).toBe(
      "Din order ligger kvar tills pallen stänger. Du behöver inte göra något.",
    );
    expect(buildExtensionConfirmSuccessBody({ locale: "en" })).toBe(
      "Your order stays in place until the pallet closes. You don't need to do anything.",
    );
    expect(EXTENSION_CONFIRM_PAGE_COPY.sv.orderCta).toBe("Se din order");
    expect(EXTENSION_CONFIRM_PAGE_ERROR_COPY.sv.expired).toContain(
      "tills pallen stänger",
    );
    expect(EXTENSION_CONFIRM_PAGE_ERROR_COPY.en.expired).toContain(
      "until the pallet closes",
    );
  });
});
