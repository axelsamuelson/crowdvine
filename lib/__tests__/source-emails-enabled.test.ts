import { describe, expect, it } from "vitest";
import { isSourceEmailsEnabled } from "@/lib/commerce/source-emails-enabled";

describe("isSourceEmailsEnabled", () => {
  it("defaults OFF when unset", () => {
    expect(isSourceEmailsEnabled({})).toBe(false);
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: undefined })).toBe(
      false,
    );
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: "" })).toBe(false);
  });

  it("is OFF for non-true values", () => {
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: "false" })).toBe(
      false,
    );
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: "1" })).toBe(false);
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: "yes" })).toBe(false);
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: "TRUE " })).toBe(
      true,
    );
  });

  it("is ON only for true (case-insensitive, trimmed)", () => {
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: "true" })).toBe(true);
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: "True" })).toBe(true);
    expect(isSourceEmailsEnabled({ SOURCE_EMAILS_ENABLED: " TRUE" })).toBe(
      true,
    );
  });
});
