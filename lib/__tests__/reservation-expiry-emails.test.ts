import { describe, expect, it } from "vitest";
import {
  buildExpiryCancelledText,
  buildExtensionAskText,
  buildExtensionConfirmSuccessBody,
  EXTENSION_CONFIRM_PAGE_COPY,
  extensionAskSubject,
  expiryCancelledSubject,
  formatExtensionDeadlineDate,
  formatReservedAmountSek,
  QUESTIONS_LINE_EN,
  QUESTIONS_LINE_SV,
  TERMS_URL_EN,
  TERMS_URL_SV,
} from "@/lib/reservations/expiry-emails";

const deadline = new Date("2026-11-06T12:00:00.000Z");

describe("reservation expiry email copy", () => {
  it("Swedish extension ask uses legal wording with deadline, amount, terms, questions", () => {
    const text = buildExtensionAskText({
      locale: "sv",
      customerName: "Anna",
      confirmUrl: "https://pactwines.com/reservation-extension/confirm?token=abc",
      replyDays: 7,
      extensionDays: 30,
      deadlineDate: deadline,
      amountSek: 1250,
    });
    expect(extensionAskSubject("sv")).toBe(
      "Vill du ge din PACT-reservation 30 dagar till?",
    );
    expect(text).toContain("har nu gällt i 30 dagar");
    expect(text).toContain("gäller en reservation i 30 dagar åt gången");
    expect(text).toContain(formatExtensionDeadlineDate(deadline, "sv"));
    expect(text).toContain(formatReservedAmountSek(1250, "sv"));
    expect(text).toContain(
      "https://pactwines.com/reservation-extension/confirm?token=abc",
    );
    expect(text).toContain("inget belopp debiteras");
    expect(text).toContain(TERMS_URL_SV);
    expect(text).toContain(QUESTIONS_LINE_SV);
    expect(text).not.toContain("Välkommen tillbaka när du vill beställa igen");
  });

  it("English extension ask mirrors legal framing", () => {
    const text = buildExtensionAskText({
      locale: "en",
      customerName: "Alex",
      confirmUrl: "https://pactwines.com/reservation-extension/confirm?token=abc",
      replyDays: 7,
      extensionDays: 30,
      deadlineDate: deadline,
      amountSek: 1250,
    });
    expect(extensionAskSubject("en")).toContain("30 more days");
    expect(text).toContain("been in effect for 30 days");
    expect(text).toContain("valid for 30 days at a time");
    expect(text).toContain(formatExtensionDeadlineDate(deadline, "en"));
    expect(text).toContain(formatReservedAmountSek(1250, "en"));
    expect(text).toContain("no amount is charged");
    expect(text).toContain(TERMS_URL_EN);
    expect(text).toContain(QUESTIONS_LINE_EN);
    expect(text).not.toContain("You are welcome to order again any time");
  });

  it("cancellation emails keep reorder invite and add questions line", () => {
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
    expect(sv).toContain(QUESTIONS_LINE_SV);

    const en = buildExpiryCancelledText({
      locale: "en",
      customerName: "Alex",
      kind: "no_reply",
    });
    expect(en).toContain("No amount has been charged");
    expect(en).toContain("new reservation");
    expect(en).toContain(QUESTIONS_LINE_EN);
  });

  it("confirmation page body includes new end date and no immediate charge", () => {
    const end = new Date("2026-12-06T12:00:00.000Z");
    const sv = buildExtensionConfirmSuccessBody({
      locale: "sv",
      newEndDate: end,
      extensionDays: 30,
    });
    expect(EXTENSION_CONFIRM_PAGE_COPY.sv.title).toContain("fortsätter");
    expect(sv).toContain("gäller i 30 dagar till, till och med");
    expect(sv).toContain(formatExtensionDeadlineDate(end, "sv"));
    expect(sv).toContain("Inget belopp debiteras nu");
    expect(sv).toContain("när pallen nått sin gräns");

    const en = buildExtensionConfirmSuccessBody({
      locale: "en",
      newEndDate: end,
      extensionDays: 30,
    });
    expect(en).toContain("another 30 days, until");
    expect(en).toContain(formatExtensionDeadlineDate(end, "en"));
    expect(en).toContain("No amount is charged now");
  });

  it("formats Swedish long dates without a hard 90-day end phrase", () => {
    expect(formatExtensionDeadlineDate(deadline, "sv")).toMatch(/november 2026/i);
  });
});
