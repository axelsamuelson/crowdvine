import { describe, expect, it } from "vitest";
import {
  formatDeliveredAtSv,
  parseDeliveredAtSv,
} from "@/components/admin/direct-box-fulfillment-panel";

describe("delivered_at sv-SE field format", () => {
  it("formats ISO to åååå-mm-dd hh:mm", () => {
    const iso = new Date(2026, 10, 11, 14, 5).toISOString();
    expect(formatDeliveredAtSv(iso)).toBe("2026-11-11 14:05");
  });

  it("parses åååå-mm-dd hh:mm back to ISO", () => {
    const iso = parseDeliveredAtSv("2026-11-11 14:05");
    expect(iso).toBeTruthy();
    expect(formatDeliveredAtSv(iso)).toBe("2026-11-11 14:05");
  });

  it("rejects US-style dates", () => {
    expect(() => parseDeliveredAtSv("11/11/2026 2:05 PM")).toThrow(/åååå-mm-dd/);
  });

  it("treats empty as null", () => {
    expect(parseDeliveredAtSv("")).toBeNull();
    expect(parseDeliveredAtSv("   ")).toBeNull();
  });
});
