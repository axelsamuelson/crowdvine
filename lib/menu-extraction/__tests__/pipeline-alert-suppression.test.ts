import { describe, expect, it } from "vitest";
import {
  buildAlertFingerprint,
  normalizeForFingerprint,
  shouldSendManagedAlert,
  type AlertStateRow,
} from "../pipeline-alert-suppression";

describe("normalizeForFingerprint", () => {
  it("collapses counts and dates", () => {
    expect(normalizeForFingerprint("25 dokument väntar (tröskel 20)")).toBe(
      "<n> dokument väntar (tröskel <n>)",
    );
    expect(normalizeForFingerprint("90% share on 2026-06-15")).toBe(
      "<n> share on <date>",
    );
  });
});

describe("buildAlertFingerprint", () => {
  it("same chronic error from different counts shares fingerprint", () => {
    const a = buildAlertFingerprint("health_extraction_pending", [
      "25 dokument väntar på extraktion (tröskel 20)",
    ]);
    const b = buildAlertFingerprint("health_extraction_pending", [
      "30 dokument väntar på extraktion (tröskel 20)",
    ]);
    expect(a).toBe(b);
  });

  it("different alert keys differ", () => {
    const a = buildAlertFingerprint("browserless_401", ["quota exceeded"]);
    const b = buildAlertFingerprint("browserless_429", ["rate limit"]);
    expect(a).not.toBe(b);
  });
});

describe("shouldSendManagedAlert", () => {
  const state: AlertStateRow = {
    alert_key: "browserless_401",
    fingerprint: "abc123",
    last_sent_at: new Date().toISOString(),
    send_count: 1,
  };

  it("chronic: suppresses same fingerprint within a week", () => {
    expect(shouldSendManagedAlert(state, "abc123", "chronic")).toBe(false);
  });

  it("chronic: sends weekly reminder for same fingerprint", () => {
    const weekAgo = {
      ...state,
      last_sent_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    };
    expect(
      shouldSendManagedAlert(
        weekAgo,
        "abc123",
        "chronic",
        new Date(),
        6 * 60 * 60 * 1000,
        7 * 24 * 60 * 60 * 1000,
      ),
    ).toBe(true);
  });

  it("chronic: sends when fingerprint changes (new error)", () => {
    expect(shouldSendManagedAlert(state, "def456", "chronic")).toBe(true);
  });

  it("chronic: sends when no prior state", () => {
    expect(shouldSendManagedAlert(null, "abc123", "chronic")).toBe(true);
  });

  it("transient: allows repeat after cooldown", () => {
    const old = {
      ...state,
      last_sent_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    };
    expect(
      shouldSendManagedAlert(old, "abc123", "transient", new Date(), 6 * 60 * 60 * 1000),
    ).toBe(true);
  });

  it("transient: suppresses within cooldown", () => {
    expect(
      shouldSendManagedAlert(state, "abc123", "transient", new Date(), 6 * 60 * 60 * 1000),
    ).toBe(false);
  });

  it("D → D+1 chronic: same error still suppressed before weekly reminder", () => {
    const crawled = {
      ...state,
      fingerprint: buildAlertFingerprint("detect_menu_updates_failure", [
        "Browserless 401: quota",
      ]),
      last_sent_at: "2026-06-15T14:30:00.000Z",
    };
    const fp = buildAlertFingerprint("detect_menu_updates_failure", [
      "Browserless 401: quota",
    ]);
    expect(
      shouldSendManagedAlert(crawled, fp, "chronic", new Date("2026-06-16T06:00:00.000Z")),
    ).toBe(false);
  });
});
