import { describe, expect, it } from "vitest";
import {
  canonicalizeEventType,
  eventTypeLabelSv,
  eventTypeQueryVariants,
} from "../event-aliases";

describe("event aliases", () => {
  it("maps legacy names to canonical", () => {
    expect(canonicalizeEventType("signup_started")).toBe(
      "auth_email_step_shown",
    );
    expect(canonicalizeEventType("payment_failed")).toBe(
      "checkout_confirm_failed",
    );
    expect(canonicalizeEventType("age_verification_passed")).toBe(
      "age_confirmed",
    );
    expect(canonicalizeEventType("auth_email_step_shown")).toBe(
      "auth_email_step_shown",
    );
  });

  it("includes legacy + canonical in query variants", () => {
    const v = eventTypeQueryVariants("auth_email_step_shown");
    expect(v).toContain("auth_email_step_shown");
    expect(v).toContain("signup_started");
  });

  it("labels legacy and canonical the same in Swedish", () => {
    expect(eventTypeLabelSv("signup_started")).toBe(
      eventTypeLabelSv("auth_email_step_shown"),
    );
  });
});
