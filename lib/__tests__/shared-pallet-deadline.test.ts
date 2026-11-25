import { describe, expect, it } from "vitest";
import {
  SHARED_PALLET_MAX_OPEN_DAYS,
  computeReservationChargeDeadlineIso,
  computeSharedPalletChargeDeadlineIso,
  formatSharedPalletChargeDeadline,
} from "@/lib/checkout/shared-pallet-deadline";

describe("shared pallet charge deadline (purchase + 28 days)", () => {
  it("locks max open window at 28 days from the purchase", () => {
    expect(SHARED_PALLET_MAX_OPEN_DAYS).toBe(28);
    const open = "2026-11-01T12:00:00.000Z";
    const deadline = computeReservationChargeDeadlineIso(open);
    expect(deadline).toBe("2026-11-29T12:00:00.000Z");
    expect(computeSharedPalletChargeDeadlineIso(open)).toBe(deadline);
  });

  it("returns null on invalid created_at", () => {
    expect(computeReservationChargeDeadlineIso(null)).toBeNull();
    expect(computeReservationChargeDeadlineIso("not-a-date")).toBeNull();
    expect(computeSharedPalletChargeDeadlineIso(null)).toBeNull();
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
