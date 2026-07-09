import { describe, expect, it } from "vitest";
import {
  buildBrowserlessApiUrl,
  browserlessGotoTimeoutMs,
  getBrowserlessTimeoutFullMs,
  getBrowserlessTimeoutHtmlMs,
} from "../browserless-config";

describe("browserless-config", () => {
  it("appends token and timeout to API URLs", () => {
    const url = buildBrowserlessApiUrl(
      "https://chrome.browserless.io/unblock",
      "test-token",
      "html",
      {},
    );
    expect(url).toContain("token=test-token");
    expect(url).toContain("timeout=30000");
  });

  it("uses full timeout for PDF mode", () => {
    const url = buildBrowserlessApiUrl(
      "https://production-sfo.browserless.io/stealth/bql",
      "tok",
      "full",
      {},
    );
    expect(url).toContain("timeout=90000");
  });

  it("respects env overrides", () => {
    expect(
      getBrowserlessTimeoutHtmlMs({
        BROWSERLESS_TIMEOUT_HTML_MS: "45000",
      }),
    ).toBe(45_000);
    expect(
      getBrowserlessTimeoutFullMs({
        BROWSERLESS_TIMEOUT_FULL_MS: "120000",
      }),
    ).toBe(120_000);
  });

  it("goto timeout stays below connection cap", () => {
    expect(browserlessGotoTimeoutMs(30_000)).toBe(28_000);
    expect(browserlessGotoTimeoutMs(5_000)).toBe(5_000);
  });
});
