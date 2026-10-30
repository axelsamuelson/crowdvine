import { describe, expect, it } from "vitest";
import {
  buildExpiryCancelledText,
  buildExtensionAskText,
  EXTENSION_CONFIRM_PAGE_COPY,
  extensionAskSubject,
  expiryCancelledSubject,
} from "@/lib/reservations/expiry-emails";

describe("reservation expiry email copy", () => {
  it("Swedish extension ask mentions confirm link and no charge", () => {
    const text = buildExtensionAskText({
      locale: "sv",
      customerName: "Anna",
      confirmUrl: "https://pactwines.com/reservation-extension/confirm?token=abc",
      replyDays: 7,
      extensionDays: 30,
    });
    expect(extensionAskSubject("sv")).toBe(
      "Vill du ge din PACT-reservation 30 dagar till?",
    );
    expect(text).toContain("köpvillkoren (punkt 3)");
    expect(text).toContain(
      "https://pactwines.com/reservation-extension/confirm?token=abc",
    );
    expect(text).toContain("Inget belopp debiteras");
    expect(text).toContain("Du kan förlänga igen senare");
    expect(text).not.toContain("90 dagar från det att den skapades");
  });

  it("English extension ask mirrors the unlimited-extension framing", () => {
    const text = buildExtensionAskText({
      locale: "en",
      customerName: "Alex",
      confirmUrl: "https://pactwines.com/reservation-extension/confirm?token=abc",
      replyDays: 7,
      extensionDays: 30,
    });
    expect(extensionAskSubject("en")).toContain("30 more days");
    expect(text).toContain("terms of purchase (section 3)");
    expect(text).toContain("No amount is charged");
    expect(text).toContain("extend again later");
  });

  it("cancellation emails state no charge and invite reorder", () => {
    const sv = buildExpiryCancelledText({
      locale: "sv",
      customerName: "Anna",
      kind: "no_reply",
    });
    expect(expiryCancelledSubject("sv", "no_reply")).toBe(
      "Din PACT-reservation har avslutats",
    );
    expect(sv).toContain("Inget belopp har debiterats");
    expect(sv).toContain("ny reservation");

    const en = buildExpiryCancelledText({
      locale: "en",
      customerName: "Alex",
      kind: "no_reply",
    });
    expect(en).toContain("No amount has been charged");
    expect(en).toContain("new reservation");
  });

  it("confirmation page copy has no hard 90-day end", () => {
    expect(EXTENSION_CONFIRM_PAGE_COPY.sv.body).toContain("30 dagar till");
    expect(EXTENSION_CONFIRM_PAGE_COPY.sv.body).not.toContain("90-dagarsgränsen");
    expect(EXTENSION_CONFIRM_PAGE_COPY.en.body).toContain("another 30 days");
    expect(EXTENSION_CONFIRM_PAGE_COPY.en.body).not.toContain("90-day limit");
  });
});
