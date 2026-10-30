import { beforeEach, describe, expect, it, vi } from "vitest";

const syncPalletShipReadiness = vi.fn();
const sumReservedBottlesOnPalletResult = vi.fn();

type QueryResult = {
  data: unknown;
  error: null | { message: string };
  count?: number | null;
};

function createSbMock(handlers: {
  palletsSelectAuto?: () => QueryResult;
  palletsSelectNonCancelled?: () => QueryResult;
  palletsUpdate?: () => QueryResult;
  reservationsSelect?: (palletId: string) => QueryResult;
}) {
  const updates: Array<Record<string, unknown>> = [];

  const from = (table: string) => {
    if (table === "pallets") {
      return {
        select: (cols: string) => {
          if (cols === "id") {
            return {
              eq: () => handlers.palletsSelectAuto?.() ?? { data: [], error: null },
            };
          }
          return {
            neq: () =>
              handlers.palletsSelectNonCancelled?.() ?? { data: [], error: null },
          };
        },
        update: (payload: Record<string, unknown>) => {
          updates.push(payload);
          return {
            eq: () => ({
              neq: async () =>
                handlers.palletsUpdate?.() ?? { data: null, error: null },
            }),
          };
        },
      };
    }
    if (table === "order_reservations") {
      return {
        select: () => ({
          eq: (_col: string, palletId: string) =>
            handlers.reservationsSelect?.(palletId) ?? {
              data: [],
              error: null,
            },
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  };

  return { from, updates };
}

describe("runPalletHygiene", () => {
  beforeEach(() => {
    vi.resetModules();
    syncPalletShipReadiness.mockReset();
    sumReservedBottlesOnPalletResult.mockReset();
  });

  it("syncs auto pallets without notifications and cancels long-empty ones", async () => {
    const sb = createSbMock({
      palletsSelectAuto: () => ({
        data: [{ id: "auto-1" }],
        error: null,
      }),
      palletsSelectNonCancelled: () => ({
        data: [
          {
            id: "empty-old",
            status: "consolidating",
            created_at: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "empty-new",
            status: "open",
            created_at: "2026-10-29T00:00:00.000Z",
          },
          {
            id: "has-bottles",
            status: "open",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        error: null,
      }),
      reservationsSelect: (palletId) => {
        if (palletId === "empty-old") {
          return {
            data: [
              {
                created_at: "2026-01-02T00:00:00.000Z",
                cancelled_at: "2026-10-01T00:00:00.000Z",
                archived_at: null,
                producer_rejected_at: null,
              },
            ],
            error: null,
          };
        }
        return { data: [], error: null };
      },
    });

    syncPalletShipReadiness.mockResolvedValue({
      becameReady: false,
      reverted: false,
      isReady: false,
    });
    sumReservedBottlesOnPalletResult.mockImplementation(async (id: string) => {
      if (id === "has-bottles") return { ok: true, bottles: 12 };
      return { ok: true, bottles: 0 };
    });

    vi.doMock("@/lib/supabase-admin", () => ({
      getSupabaseAdmin: () => sb,
    }));
    vi.doMock("@/lib/pallet-completion", () => ({
      syncPalletShipReadiness,
    }));
    vi.doMock("@/lib/pallet-fill-count", () => ({
      sumReservedBottlesOnPalletResult,
    }));

    const { runPalletHygiene } = await import("@/lib/pallet-hygiene");
    const result = await runPalletHygiene({
      nowMs: Date.parse("2026-10-30T12:00:00.000Z"),
    });

    expect(syncPalletShipReadiness).toHaveBeenCalledWith("auto-1", {
      allowNotifications: false,
    });
    expect(result.synced).toBe(1);
    expect(result.cancelled).toEqual(["empty-old"]);
    expect(sb.updates).toEqual([
      expect.objectContaining({ status: "cancelled" }),
    ]);
  });
});
