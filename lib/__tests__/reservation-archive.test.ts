import { describe, expect, it } from "vitest";
import {
  ARCHIVED_RESERVATION_STATUS,
  NON_ACTIVE_RESERVATION_STATUSES,
  NON_ACTIVE_RESERVATION_STATUSES_POSTGREST,
  isReservationArchived,
} from "@/lib/reservations/archive";

describe("reservation archive helpers", () => {
  it("treats status archived as archived", () => {
    expect(isReservationArchived({ status: "archived" })).toBe(true);
    expect(isReservationArchived({ status: "ARCHIVED" })).toBe(true);
  });

  it("treats archived_at as archived even if status lags", () => {
    expect(
      isReservationArchived({
        status: "pending_payment",
        archived_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("does not treat active statuses as archived", () => {
    expect(isReservationArchived({ status: "pending_payment" })).toBe(false);
    expect(isReservationArchived({ status: "placed", archived_at: null })).toBe(
      false,
    );
  });

  it("includes archived in non-active denylist", () => {
    expect(NON_ACTIVE_RESERVATION_STATUSES).toContain(
      ARCHIVED_RESERVATION_STATUS,
    );
    expect(NON_ACTIVE_RESERVATION_STATUSES_POSTGREST).toContain("archived");
    expect(NON_ACTIVE_RESERVATION_STATUSES_POSTGREST).toContain("cancelled");
  });
});
