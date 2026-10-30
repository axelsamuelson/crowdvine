import { beforeEach, describe, expect, it, vi } from "vitest";

describe("cleanupEmptyPallets history guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("does not delete open pallets that have reservation history", async () => {
    const deletedIds: string[] = [];
    const from = (table: string) => {
      if (table === "pallets") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [{ id: "hist-1" }, { id: "virgin-1" }],
                  error: null,
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: (_c: string, id: string) => {
              deletedIds.push(id);
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "order_reservations") {
        return {
          select: () => ({
            eq: (_c: string, palletId: string) => ({
              then: undefined,
              // head count API shape used by supabase-js
            }),
            // mimic: .select(..., { count, head }).eq(...)
          }),
        };
      }
      return {};
    };

    // Build a chainable mock that supports count head queries + bottle sum.
    const reservationCounts: Record<string, number> = {
      "hist-1": 2,
      "virgin-1": 0,
    };
    const bookingCounts: Record<string, number> = {
      "hist-1": 0,
      "virgin-1": 0,
    };

    const sb = {
      from: (table: string) => {
        if (table === "pallets") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({
                    data: [{ id: "hist-1" }, { id: "virgin-1" }],
                    error: null,
                  }),
                }),
              }),
            }),
            delete: () => ({
              eq: async (_c: string, id: string) => {
                deletedIds.push(id);
                return { error: null };
              },
            }),
          };
        }
        if (table === "order_reservations") {
          return {
            select: () => ({
              eq: async (_c: string, palletId: string) => ({
                count: reservationCounts[palletId] ?? 0,
                error: null,
              }),
            }),
          };
        }
        if (table === "bookings") {
          return {
            select: () => ({
              eq: async (_c: string, palletId: string) => ({
                count: bookingCounts[palletId] ?? 0,
                error: null,
              }),
            }),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    };

    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => sb,
    }));
    vi.doMock("@/lib/pallet-fill-count", () => ({
      PALLET_FILL_STATUSES: [],
      sumReservedBottlesOnPallet: async () => 0,
    }));

    const { cleanupEmptyPallets } = await import(
      "@/lib/pallet-auto-management"
    );
    const result = await cleanupEmptyPallets("region-1", "zone-1");

    expect(result.deleted).toEqual(["virgin-1"]);
    expect(deletedIds).toEqual(["virgin-1"]);
  });
});
