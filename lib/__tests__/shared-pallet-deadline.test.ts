import { describe, expect, it } from "vitest";
import {
  SHARED_PALLET_MAX_OPEN_DAYS,
  computeSharedPalletChargeDeadlineIso,
  formatSharedPalletChargeDeadline,
} from "@/lib/checkout/shared-pallet-deadline";

describe("shared pallet charge deadline (created_at + 4 weeks)", () => {
  it("locks max open window at 28 days from created_at", () => {
    expect(SHARED_PALLET_MAX_OPEN_DAYS).toBe(28);
    const open = "2026-11-01T12:00:00.000Z";
    const deadline = computeSharedPalletChargeDeadlineIso(open);
    expect(deadline).toBe("2026-11-29T12:00:00.000Z");
  });

  it("returns null on invalid created_at", () => {
    expect(computeSharedPalletChargeDeadlineIso(null)).toBeNull();
    expect(computeSharedPalletChargeDeadlineIso("not-a-date")).toBeNull();
  });

  it("formats Swedish date for CTA copy", () => {
    const label = formatSharedPalletChargeDeadline(
      "2026-11-29T12:00:00.000Z",
      "sv",
    );
    expect(label).toMatch(/29/);
    expect(label).toMatch(/november|nov/i);
  });
});
