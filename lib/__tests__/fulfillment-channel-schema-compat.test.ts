/**
 * Schema-compat: migration 277 (fulfillment_channel) is NOT applied in prod.
 * Reservation detail GET + pallet-close scans must succeed without that column;
 * resolveAmountOre must never guess from catalog wine prices.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const setupIntentsRetrieve = vi.fn();
let lastReservationSelectCols = "";
let amountRow: {
  setup_intent_id: string | null;
  total_sek: number | null;
} = {
  setup_intent_id: "seti_1",
  total_sek: 445,
};

function missingFulfillmentColumnError() {
  return {
    message:
      "Could not find the 'fulfillment_channel' column of 'order_reservations' in the schema cache",
    code: "PGRST204",
  };
}

function thenableResult(payload: { data: unknown; error: unknown }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  for (const k of [
    "select",
    "eq",
    "neq",
    "is",
    "in",
    "or",
    "not",
    "lte",
    "order",
    "limit",
    "update",
    "insert",
  ]) {
    api[k] = self;
  }
  api.maybeSingle = async () => payload;
  api.single = async () => payload;
  api.then = (
    resolveFn: (v: typeof payload) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(payload).then(resolveFn, reject);
  return api;
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
  headers: async () => new Headers(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    setupIntents: {
      retrieve: (...args: unknown[]) => setupIntentsRetrieve(...args),
    },
  },
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => ({
      select: (cols: string) => {
        if (table === "order_reservations") {
          lastReservationSelectCols = String(cols ?? "");
          if (lastReservationSelectCols.includes("fulfillment_channel")) {
            return thenableResult({
              data: null,
              error: missingFulfillmentColumnError(),
            });
          }
          // Detail GET shape
          if (lastReservationSelectCols.includes("order_reservation_items")) {
            return thenableResult({
              data: {
                id: "res-1",
                status: "placed",
                created_at: "2026-03-01T12:00:00.000Z",
                pallet_id: "pal-1",
                pickup_zone_id: null,
                delivery_zone_id: "dz-1",
                address_id: null,
                user_id: "user-1",
                payment_method_type: "card",
                payment_mode: "setup_intent",
                total_sek: 445,
                discount_amount_sek: 0,
                shipping_revenue_gross_cents: 4900,
                pallet: {
                  name: "Pallet A",
                  cost_cents: 0,
                  bottle_capacity: 600,
                  created_at: "2026-03-01T00:00:00.000Z",
                },
                order_reservation_items: [
                  {
                    item_id: "wine-1",
                    quantity: 1,
                    wines: {
                      wine_name: "Test Wine",
                      vintage: "2022",
                      base_price_cents: 44502,
                      handle: "test-wine",
                      label_image_path: null,
                      producers: { name: "Prod", display_name: "Prod" },
                    },
                  },
                ],
              },
              error: null,
            });
          }
          // resolveAmountOre narrow select
          if (
            lastReservationSelectCols.includes("setup_intent_id") &&
            lastReservationSelectCols.includes("total_sek")
          ) {
            return thenableResult({
              data: amountRow,
              error: null,
            });
          }
          // pallet-close snapshot selects
          return thenableResult({
            data: [],
            error: null,
          });
        }
        if (table === "pallet_zones") {
          return thenableResult({
            data: [{ id: "dz-1", name: "Stockholm" }],
            error: null,
          });
        }
        if (table === "profiles") {
          return thenableResult({
            data: { full_name: "Test", email: "t@example.com" },
            error: null,
          });
        }
        if (table === "wines") {
          return thenableResult({
            data: [
              {
                id: "wine-1",
                wine_name: "Test Wine",
                vintage: "2022",
                base_price_cents: 44502,
                handle: "test-wine",
                label_image_path: null,
                producers: { name: "Prod", display_name: "Prod" },
              },
            ],
            error: null,
          });
        }
        if (table === "reservation_shared_items") {
          return thenableResult({ data: [], error: null });
        }
        if (table === "email_sends") {
          return thenableResult({ data: null, error: null });
        }
        if (table === "order_reservation_items") {
          // Legacy wine-sum path must not be used; still return data for safety.
          return thenableResult({
            data: [{ quantity: 1, wines: { base_price_cents: 44502 } }],
            error: null,
          });
        }
        if (table === "pallet_close_events") {
          return {
            insert: async () => ({ data: null, error: null }),
          };
        }
        return thenableResult({ data: null, error: null });
      },
      update: () => thenableResult({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }),
    }),
  }),
}));

describe("schema without fulfillment_channel (migration 277 absent)", () => {
  beforeEach(() => {
    vi.resetModules();
    getCurrentUser.mockReset();
    setupIntentsRetrieve.mockReset();
    lastReservationSelectCols = "";
    amountRow = { setup_intent_id: "seti_1", total_sek: 445 };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    delete process.env.PALLET_CLOSE_FLOW_ENABLED;
    delete process.env.CHECKOUT_DUAL_OFFER_COMPARE;
  });

  it("reservation detail select omits fulfillment_channel", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/api/user/reservations/[id]/route.ts"),
      "utf8",
    );
    expect(src).not.toMatch(
      /select\(\s*`[\s\S]*?\bfulfillment_channel\b[\s\S]*?`\s*\)/,
    );
  });

  it("GET /api/user/reservations/:id succeeds without fulfillment_channel", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", email: "t@example.com" });
    const { GET } = await import("@/app/api/user/reservations/[id]/route");
    const res = await GET(new Request("http://localhost/api/user/reservations/res-1"), {
      params: Promise.resolve({ id: "res-1" }),
    });
    expect(lastReservationSelectCols).not.toMatch(/fulfillment_channel/);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("res-1");
    expect(json.fulfillment_channel).toBeNull();
    expect(json.error).toBeUndefined();
  });

  it("pallet-close snapshot select omits fulfillment_channel and run succeeds", async () => {
    process.env.PALLET_CLOSE_FLOW_ENABLED = "true";
    process.env.CHECKOUT_DUAL_OFFER_COMPARE = "true";
    const {
      PALLET_CLOSE_SNAPSHOT_SELECT,
      runPalletCloseJob,
    } = await import("@/lib/checkout/pallet-close/run");
    expect(PALLET_CLOSE_SNAPSHOT_SELECT).not.toMatch(/fulfillment_channel/);
    const summary = await runPalletCloseJob(
      new Date("2026-04-01T00:00:00.000Z"),
    );
    expect(summary.enabled).toBe(true);
    expect(summary.errors).toBe(0);
  });
});

describe("resolveAmountOre", () => {
  beforeEach(() => {
    vi.resetModules();
    setupIntentsRetrieve.mockReset();
    amountRow = { setup_intent_id: "seti_1", total_sek: 445 };
  });

  it("prefers SetupIntent metadata.expected_amount_ore", async () => {
    setupIntentsRetrieve.mockResolvedValue({
      metadata: { expected_amount_ore: "49900" },
    });
    const { resolveAmountOre } = await import("@/lib/checkout/pallet-close/run");
    await expect(resolveAmountOre("res-1")).resolves.toBe(49900);
  });

  it("falls back to total_sek * 100 (not catalog wine sum)", async () => {
    setupIntentsRetrieve.mockResolvedValue({ metadata: {} });
    const { resolveAmountOre } = await import("@/lib/checkout/pallet-close/run");
    // total_sek 445 → 44500 öre (not 44502 list price).
    await expect(resolveAmountOre("res-1")).resolves.toBe(44500);
  });

  it("refuses when expected_amount_ore and total_sek are both unavailable", async () => {
    amountRow = { setup_intent_id: "seti_1", total_sek: null };
    setupIntentsRetrieve.mockResolvedValue({ metadata: {} });
    const { resolveAmountOre } = await import("@/lib/checkout/pallet-close/run");
    await expect(resolveAmountOre("res-missing")).resolves.toBeNull();
  });
});
