import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARCHIVED_BOOKING_STATUS,
  ACTIVE_BOOKING_STATUSES,
  isBookingArchived,
} from "@/lib/bookings/archive";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";

describe("booking archive helpers", () => {
  it("treats status archived as archived", () => {
    expect(isBookingArchived({ status: "archived" })).toBe(true);
    expect(isBookingArchived({ status: "ARCHIVED" })).toBe(true);
  });

  it("treats archived_at as archived even if status lags", () => {
    expect(
      isBookingArchived({
        status: "reserved",
        archived_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("does not treat reserved as archived", () => {
    expect(isBookingArchived({ status: "reserved" })).toBe(false);
    expect(isBookingArchived({ status: "reserved", archived_at: null })).toBe(
      false,
    );
  });

  it("keeps reserved as the only active booking status", () => {
    expect(ACTIVE_BOOKING_STATUSES).toEqual(["reserved"]);
    expect(ACTIVE_BOOKING_STATUSES).not.toContain(ARCHIVED_BOOKING_STATUS);
  });
});

describe("pallet fill never counts bookings or archived reservations", () => {
  it("excludes archived and cancelled from PALLET_FILL_STATUSES", () => {
    expect(PALLET_FILL_STATUSES).not.toContain("archived");
    expect(PALLET_FILL_STATUSES).not.toContain("cancelled");
    expect(PALLET_FILL_STATUSES).not.toContain("reserved");
  });

  /**
   * Middle Languedoc (3985cbfe-…) showed 96/120 while reservations were
   * already archived. Decomposition of the inflated total:
   *   60  bookings on the pallet (status reserved)
   * +  6  orphan booking (pallet_id NULL)
   * + 30  archived order_reservation_items on the pallet
   * = 96
   * Canonical fill uses only PALLET_FILL_STATUSES (+ archived_at IS NULL)
   * and must stay 0 once reservations are archived — legacy bookings must
   * be soft-archived separately (migration 248).
   */
  it("documents Middle Languedoc 96 = all bookings + archived reservation bottles", () => {
    const palletBookings = 60;
    const orphanBooking = 6;
    const archivedReservationBottles = 30;
    expect(palletBookings + orphanBooking + archivedReservationBottles).toBe(
      96,
    );
    expect(PALLET_FILL_STATUSES.includes("archived" as never)).toBe(false);
  });
});

describe("archive/unarchive booking update payloads", () => {
  const updatePayloads: Record<string, unknown>[] = [];

  beforeEach(() => {
    updatePayloads.length = 0;
    vi.resetModules();
    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "book-1",
                  status: "reserved",
                  archived_at: null,
                  pallet_id: "pallet-1",
                },
                error: null,
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            updatePayloads.push(payload);
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { id: "book-1", ...payload },
                    error: null,
                  }),
                }),
              }),
            };
          },
        }),
      }),
    }));
  });

  it("archiveBooking sets archived status and archived_at", async () => {
    const { archiveBooking } = await import("@/lib/bookings/archive");
    const result = await archiveBooking({
      bookingId: "book-1",
      reason: "legacy cleanup",
    });
    expect(result.ok).toBe(true);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]?.status).toBe("archived");
    expect(updatePayloads[0]?.status_before_archive).toBe("reserved");
    expect(updatePayloads[0]).toHaveProperty("archived_at");
    expect(updatePayloads[0]?.archive_reason).toBe("legacy cleanup");
  });

  it("unarchiveBooking restores prior status", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "book-1",
                  status: "archived",
                  archived_at: "2026-01-01T00:00:00Z",
                  status_before_archive: "reserved",
                  pallet_id: "pallet-1",
                },
                error: null,
              }),
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            updatePayloads.push(payload);
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { id: "book-1", ...payload },
                    error: null,
                  }),
                }),
              }),
            };
          },
        }),
      }),
    }));

    const { unarchiveBooking } = await import("@/lib/bookings/archive");
    const result = await unarchiveBooking({ bookingId: "book-1" });
    expect(result.ok).toBe(true);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]?.status).toBe("reserved");
    expect(updatePayloads[0]?.archived_at).toBeNull();
  });
});
