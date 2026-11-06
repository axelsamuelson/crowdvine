/**
 * Admin reservations list: fulfillment fields + old-schema fallback + display.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAdminFulfillmentDisplay } from "@/lib/admin/fulfillment-display";
import { fetchAdminReservationsList } from "@/lib/admin/reservations-list-query";

describe("resolveAdminFulfillmentDisplay", () => {
  it("shows dispatch status as Fulfillment, not Charge hold", () => {
    const badges = resolveAdminFulfillmentDisplay({
      fulfillment_channel: "direct_box",
      fulfillment_dispatch_status: "pending_manual_handoff",
      charge_blocked_reason: null,
    });
    expect(badges).toEqual([
      {
        kind: "fulfillment",
        label: "Fulfillment: pending_manual_handoff",
        title: "pending_manual_handoff",
      },
    ]);
    expect(badges.some((b) => b?.kind === "charge_hold")).toBe(false);
  });

  it("legacy DIRECT_BOX_FULFILLMENT_PENDING is fulfillment, not charge hold", () => {
    const badges = resolveAdminFulfillmentDisplay({
      charge_blocked_reason: "DIRECT_BOX_FULFILLMENT_PENDING",
    });
    expect(badges[0]?.kind).toBe("fulfillment");
    expect(badges[0]?.label).toMatch(/legacy/i);
  });

  it("real billing holds remain Charge hold", () => {
    const badges = resolveAdminFulfillmentDisplay({
      charge_blocked_reason: "US_CONDITIONAL_TERMS",
    });
    expect(badges).toEqual([
      {
        kind: "charge_hold",
        label: "Charge hold: US_CONDITIONAL_TERMS",
        title: "US_CONDITIONAL_TERMS",
      },
    ]);
  });
});

describe("fetchAdminReservationsList (compat)", () => {
  it("returns fulfillment columns when present", async () => {
    const rows = [
      {
        id: "r1",
        fulfillment_channel: "direct_box",
        fulfillment_dispatch_status: "pending_manual_handoff",
        charge_blocked_reason: null,
      },
    ];
    const sb = {
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => ({
              neq: () => ({
                is: async () => ({ data: rows, error: null }),
              }),
            }),
          }),
        }),
      }),
    };
    const result = await fetchAdminReservationsList(sb as never, "active");
    expect(result.fulfillmentColumnsAvailable).toBe(true);
    expect(result.reservations[0]?.fulfillment_dispatch_status).toBe(
      "pending_manual_handoff",
    );
  });

  it("falls back when fulfillment columns missing (old schema)", async () => {
    let selectCall = 0;
    const baseRows = [{ id: "r1", charge_blocked_reason: null }];
    const sb = {
      from: () => ({
        select: () => {
          selectCall += 1;
          const err =
            selectCall === 1
              ? {
                  message:
                    "Could not find the 'fulfillment_dispatch_status' column of 'order_reservations' in the schema cache",
                }
              : null;
          const data = selectCall === 1 ? null : baseRows;
          return {
            order: () => ({
              limit: () => ({
                neq: () => ({
                  is: async () => ({ data, error: err }),
                }),
              }),
            }),
          };
        },
      }),
    };
    const result = await fetchAdminReservationsList(sb as never, "active");
    expect(result.error).toBeNull();
    expect(result.fulfillmentColumnsAvailable).toBe(false);
    expect(result.reservations).toHaveLength(1);
  });
});

const getCurrentUser = vi.fn();
let listSelectMode: "with_fulfillment" | "missing_column" = "with_fulfillment";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => {
    const chain = (payload: {
      data: unknown;
      error: { message: string } | null;
    }) => {
      const q: Record<string, unknown> = {};
      const self = () => q;
      for (const k of ["select", "order", "limit", "eq", "neq", "is", "in"]) {
        q[k] = self;
      }
      q.then = (
        resolve: (v: typeof payload) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(payload).then(resolve, reject);
      // terminal filters return thenable
      q.neq = () => ({
        is: async () => payload,
      });
      q.eq = async () => payload;
      q.is = async () => payload;
      return q;
    };

    return {
      from: (table: string) => {
        if (table === "order_reservations") {
          if (listSelectMode === "missing_column") {
            // First select fails; fetchAdminReservationsList retries — we need
            // select() to alternate. Simpler: always succeed with fulfillment
            // for route test "with columns" path; separate unit covers fallback.
            return {
              select: (cols: string) => {
                if (
                  typeof cols === "string" &&
                  cols.includes("fulfillment_dispatch_status")
                ) {
                  return chain({
                    data: null,
                    error: {
                      message:
                        "Could not find the 'fulfillment_dispatch_status' column of 'order_reservations' in the schema cache",
                    },
                  });
                }
                return chain({
                  data: [
                    {
                      id: "res-legacy",
                      status: "pending_producer_approval",
                      payment_status: "paid",
                      charge_blocked_reason: null,
                      created_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                });
              },
            };
          }
          return {
            select: () =>
              chain({
                data: [
                  {
                    id: "res-direct",
                    status: "pending_producer_approval",
                    payment_status: "paid",
                    payment_mode: "payment_intent",
                    fulfillment_channel: "direct_box",
                    fulfillment_dispatch_status: "pending_manual_handoff",
                    charge_blocked_reason: null,
                    created_at: new Date().toISOString(),
                    user_id: "user-1",
                  },
                ],
                error: null,
              }),
          };
        }
        if (table === "order_reservation_items") {
          return {
            select: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "admin-1",
                    email: "a@example.com",
                    role: "admin",
                    roles: ["admin"],
                  },
                  error: null,
                }),
                in: async () => ({
                  data: [{ id: "user-1", full_name: "U", email: "u@x.com" }],
                  error: null,
                }),
              }),
              in: async () => ({
                data: [{ id: "user-1", full_name: "U", email: "u@x.com" }],
                error: null,
              }),
            }),
          };
        }
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      },
    };
  },
}));

describe("WIRED GET /api/admin/reservations", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentUser.mockReset();
    getCurrentUser.mockResolvedValue({ id: "admin-1", email: "a@example.com" });
    listSelectMode = "with_fulfillment";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  });

  it("returns fulfillment_channel + dispatch_status on list payload", async () => {
    const { GET } = await import("@/app/api/admin/reservations/route");
    const res = await GET(new Request("http://localhost/api/admin/reservations"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reservations?.length).toBeGreaterThan(0);
    const row = json.reservations[0];
    expect(row.fulfillment_channel).toBe("direct_box");
    expect(row.fulfillment_dispatch_status).toBe("pending_manual_handoff");
    // Display contract: not a charge hold
    const badges = resolveAdminFulfillmentDisplay(row);
    expect(badges.every((b) => b?.kind !== "charge_hold")).toBe(true);
  });

  it("old schema: list still succeeds without fulfillment columns", async () => {
    listSelectMode = "missing_column";
    const { GET } = await import("@/app/api/admin/reservations/route");
    const res = await GET(new Request("http://localhost/api/admin/reservations"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.error).toBeUndefined();
    expect(Array.isArray(json.reservations)).toBe(true);
  });
});
