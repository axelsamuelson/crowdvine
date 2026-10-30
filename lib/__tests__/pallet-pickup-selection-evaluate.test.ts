import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();
const getPalletPhysicalSettings = vi.fn();
const sumReservedBottlesOnPallet = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

vi.mock("@/lib/pallet-physical-settings", () => ({
  getPalletPhysicalSettings: (...args: unknown[]) =>
    getPalletPhysicalSettings(...args),
}));

vi.mock("@/lib/pallet-fill-count", () => ({
  PALLET_FILL_STATUSES: ["paid", "confirmed"] as const,
  sumReservedBottlesOnPallet: (...args: unknown[]) =>
    sumReservedBottlesOnPallet(...args),
}));

import { evaluatePalletPickupSelection } from "@/lib/pallet-pickup-selection";

function chain(result: { data: unknown; error: unknown }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  for (const m of [
    "select",
    "eq",
    "in",
    "is",
    "or",
    "limit",
    "order",
    "update",
    "insert",
    "neq",
  ]) {
    api[m] = vi.fn(self);
  }
  api.maybeSingle = vi.fn(async () => result);
  api.single = vi.fn(async () => result);
  // thenable for awaited query builders without single/maybeSingle
  api.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return api;
}

describe("evaluatePalletPickupSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPalletPhysicalSettings.mockResolvedValue({
      minBottlesToComplete: 120,
      pickupSelectionTriggerShare: 0.8,
      weightLimitKg: null,
      kgPerBottle: 1.4,
    });
    sumReservedBottlesOnPallet.mockResolvedValue(96);
  });

  it("does not write current_pickup_producer_id and creates an admin task at trigger", async () => {
    const palletSelect = chain({
      data: {
        id: "pallet-1",
        name: "Test pallet",
        status: "open",
        min_bottles_to_complete: 120,
        current_pickup_producer_id: null,
        pickup_producer_confirmed_at: null,
        pickup_selection_triggered_at: null,
        pickup_selection_task_id: null,
        shipping_region_id: "region-1",
      },
      error: null,
    });

    const producersSelect = chain({
      data: [
        { id: "prod-a", name: "Alpha", is_pallet_zone: true },
        { id: "prod-b", name: "Beta", is_pallet_zone: true },
      ],
      error: null,
    });

    const reservationsSelect = chain({
      data: [{ id: "res-1" }],
      error: null,
    });
    // override thenable for list queries
    (reservationsSelect as { then: unknown }).then = (
      resolve: (v: unknown) => unknown,
    ) =>
      Promise.resolve({ data: [{ id: "res-1" }], error: null }).then(resolve);

    const itemsSelect = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { quantity: 80, item_id: "wine-a" },
          { quantity: 16, item_id: "wine-b" },
        ],
        error: null,
      }),
    };

    const winesSelect = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: "wine-a", producer_id: "prod-a" },
          { id: "wine-b", producer_id: "prod-b" },
        ],
        error: null,
      }),
    };

    const profilesSelect = chain({
      data: [{ id: "admin-1", role: "admin", roles: ["admin"] }],
      error: null,
    });
    (profilesSelect as { then: unknown }).then = (
      resolve: (v: unknown) => unknown,
    ) =>
      Promise.resolve({
        data: [{ id: "admin-1", role: "admin", roles: ["admin"] }],
        error: null,
      }).then(resolve);

    const taskInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "task-1" },
        error: null,
      }),
    };

    const linkInsert = {
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const palletUpdate = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    fromMock.mockImplementation((table: string) => {
      if (table === "pallets") {
        // first call select, later update
        if (fromMock.mock.calls.filter((c) => c[0] === "pallets").length <= 1) {
          return palletSelect;
        }
        return palletUpdate;
      }
      if (table === "producers") return producersSelect;
      if (table === "order_reservations") return reservationsSelect;
      if (table === "order_reservation_items") return itemsSelect;
      if (table === "wines") return winesSelect;
      if (table === "profiles") return profilesSelect;
      if (table === "admin_tasks") return taskInsert;
      if (table === "admin_entity_links") return linkInsert;
      return chain({ data: null, error: null });
    });

    // First pallet read uses shipping_region via load counts + evaluate
    // Re-mock pallet select to also serve shipping_region_id load
    const regionPallet = chain({
      data: { id: "pallet-1", shipping_region_id: "region-1" },
      error: null,
    });

    let palletCalls = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === "pallets") {
        palletCalls += 1;
        if (palletCalls === 1) {
          // evaluatePalletPickupSelection initial select
          return chain({
            data: {
              id: "pallet-1",
              name: "Test pallet",
              status: "open",
              min_bottles_to_complete: 120,
              current_pickup_producer_id: null,
              pickup_producer_confirmed_at: null,
              pickup_selection_triggered_at: null,
              pickup_selection_task_id: null,
            },
            error: null,
          });
        }
        if (palletCalls === 2) {
          // loadPalletProducerBottleCounts
          return regionPallet;
        }
        return palletUpdate;
      }
      if (table === "producers") return producersSelect;
      if (table === "order_reservations") return reservationsSelect;
      if (table === "order_reservation_items") return itemsSelect;
      if (table === "wines") return winesSelect;
      if (table === "profiles") return profilesSelect;
      if (table === "admin_tasks") return taskInsert;
      if (table === "admin_entity_links") return linkInsert;
      return chain({ data: null, error: null });
    });

    const result = await evaluatePalletPickupSelection("pallet-1");

    expect(result.triggerReached).toBe(true);
    expect(result.taskCreated).toBe(true);
    expect(result.taskId).toBe("task-1");
    expect(result.suggestion.producerId).toBe("prod-a");
    expect(taskInsert.insert).toHaveBeenCalled();
    expect(palletUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        pickup_selection_triggered_at: expect.any(String),
        pickup_selection_task_id: "task-1",
      }),
    );
    // Must never auto-set pickup producer
    const updatePayload = palletUpdate.update.mock.calls[0]?.[0] ?? {};
    expect(updatePayload).not.toHaveProperty("current_pickup_producer_id");
  });

  it("is idempotent when already triggered", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "pallets") {
        return chain({
          data: {
            id: "pallet-1",
            name: "Test pallet",
            status: "open",
            min_bottles_to_complete: 120,
            current_pickup_producer_id: null,
            pickup_producer_confirmed_at: null,
            pickup_selection_triggered_at: "2026-01-01T00:00:00Z",
            pickup_selection_task_id: "task-existing",
          },
          error: null,
        });
      }
      return chain({ data: null, error: null });
    });

    // Still need bottle counts path — second pallet call
    let palletCalls = 0;
    fromMock.mockImplementation((table: string) => {
      if (table === "pallets") {
        palletCalls += 1;
        if (palletCalls === 1) {
          return chain({
            data: {
              id: "pallet-1",
              name: "Test pallet",
              status: "open",
              min_bottles_to_complete: 120,
              current_pickup_producer_id: null,
              pickup_producer_confirmed_at: null,
              pickup_selection_triggered_at: "2026-01-01T00:00:00Z",
              pickup_selection_task_id: "task-existing",
            },
            error: null,
          });
        }
        return chain({
          data: { id: "pallet-1", shipping_region_id: "region-1" },
          error: null,
        });
      }
      if (table === "producers") {
        const c = chain({
          data: [{ id: "prod-a", name: "Alpha", is_pallet_zone: true }],
          error: null,
        });
        return c;
      }
      if (table === "order_reservations") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return chain({ data: null, error: null });
    });

    const result = await evaluatePalletPickupSelection("pallet-1");
    expect(result.triggerReached).toBe(true);
    expect(result.taskCreated).toBe(false);
    expect(result.taskId).toBe("task-existing");
  });
});
