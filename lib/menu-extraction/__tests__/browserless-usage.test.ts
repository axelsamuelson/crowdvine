import { describe, expect, it } from "vitest";
import {
  createEmptyBrowserlessUsage,
  getBrowserlessUsage,
  recordBrowserlessCall,
  withBrowserlessUsageTracking,
} from "../browserless-usage";

describe("browserless-usage", () => {
  it("tracks html and full calls with estimated units", async () => {
    const { browserless } = await withBrowserlessUsageTracking(async () => {
      recordBrowserlessCall("html", "/unblock");
      recordBrowserlessCall("html", "/content");
      recordBrowserlessCall("full", "/stealth/bql");
      return "done";
    });

    expect(browserless).toEqual({
      html_calls: 2,
      full_calls: 1,
      total_calls: 3,
      estimated_units: 5,
    });
  });

  it("returns null outside tracking scope", () => {
    expect(getBrowserlessUsage()).toBeNull();
    expect(createEmptyBrowserlessUsage().estimated_units).toBe(0);
  });
});
