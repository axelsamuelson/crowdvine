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

describe("pallet status email copy (Juliette §1)", () => {
  it("Swedish status email — no confirmation, cancel link, pactwines.com", () => {
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
    expect(statusEmailSubject("sv")).toBe("Läget för din PACT-pall");
    expect(text).toContain("Din order ord-1 väntar fortfarande");
    expect(text).toContain("120 av 270 flaskor");
    expect(text).toContain("Du behöver inte göra något");
    expect(text).toContain(formatReservedAmountSek(1250, "sv"));
    expect(text).toContain("avbryta utan kostnad");
    expect(text).toContain("https://pactwines.com/profile/reservations");
    expect(text).toContain("pallet-close/cancel?token=abc");
    expect(text).toContain(STATUS_FOOTER_SV);
    expect(text).toContain("pactwines.com");
    expect(text).not.toContain("pact.wine");
    expect(text).not.toContain("Bekräfta senast");
    expect(text).not.toContain("förläng");
    expect(text).not.toContain("köpvillkoren (punkt 3)");
  });

  it("English status email mirrors no-action framing", () => {
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
    expect(statusEmailSubject("en")).toBe("An update on your PACT pallet");
    expect(text).toContain("still waiting for the pallet to fill");
    expect(text).toContain("You don't need to do anything");
    expect(text).toContain("cancel free of charge");
    expect(text).toContain(STATUS_FOOTER_EN);
    expect(text).not.toContain("pact.wine");
  });

  it("HTML includes both CTAs", () => {
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
    expect(html).toContain("Se din order");
    expect(html).toContain("Avbryt ordern");
    expect(html).not.toContain("Ge reservationen");
  });

  it("legacy extension confirm page shows exact fixed copy", () => {
    expect(EXTENSION_CONFIRM_PAGE_COPY.sv.title).toBe("Ingen åtgärd behövs");
    expect(buildExtensionConfirmSuccessBody({ locale: "sv" })).toBe(
      "Din order ligger kvar, du behöver inte göra något",
    );
    expect(buildExtensionConfirmSuccessBody({ locale: "en" })).toBe(
      "Your order stays, no action needed",
    );
    expect(EXTENSION_CONFIRM_PAGE_ERROR_COPY.sv.expired).toBe(
      "Din order ligger kvar, du behöver inte göra något",
    );
    expect(EXTENSION_CONFIRM_PAGE_ERROR_COPY.en.expired).toBe(
      "Your order stays, no action needed",
    );
  });
});
