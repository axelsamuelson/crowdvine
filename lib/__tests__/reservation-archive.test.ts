import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("archive/unarchive update payloads", () => {
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
                  id: "res-1",
                  status: "pending_payment",
                  archived_at: null,
                  status_before_archive: null,
                  pallet_id: null,
                  retry_scheduled_at: null,
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
                    data: { id: "res-1", ...payload },
                    error: null,
                  }),
                }),
              }),
            };
          },
        }),
      }),
    }));
    vi.doMock("@/lib/pallet-completion", () => ({
      syncPalletShipReadiness: async () => undefined,
    }));
  });

  it("archiveReservation does not write updated_at", async () => {
    const { archiveReservation } = await import("@/lib/reservations/archive");
    const result = await archiveReservation({
      reservationId: "res-1",
      reason: "test",
    });
    expect(result.ok).toBe(true);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).not.toHaveProperty("updated_at");
    expect(updatePayloads[0]?.status).toBe("archived");
    expect(updatePayloads[0]?.status_before_archive).toBe("pending_payment");
    expect(updatePayloads[0]).toHaveProperty("archived_at");
  });

  it("unarchiveReservation does not write updated_at", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "res-1",
                  status: "archived",
                  archived_at: "2026-01-01T00:00:00Z",
                  status_before_archive: "pending_payment",
                  pallet_id: null,
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
                    data: { id: "res-1", ...payload },
                    error: null,
                  }),
                }),
              }),
            };
          },
        }),
      }),
    }));
    vi.doMock("@/lib/pallet-completion", () => ({
      syncPalletShipReadiness: async () => undefined,
    }));

    const { unarchiveReservation } = await import("@/lib/reservations/archive");
    const result = await unarchiveReservation({ reservationId: "res-1" });
    expect(result.ok).toBe(true);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).not.toHaveProperty("updated_at");
    expect(updatePayloads[0]?.status).toBe("pending_payment");
    expect(updatePayloads[0]?.archived_at).toBeNull();
  });
});
