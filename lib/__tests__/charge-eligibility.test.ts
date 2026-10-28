import { beforeEach, describe, expect, it, vi } from "vitest";
import { isChargeEligible } from "@/lib/legal/charge-eligibility";

const { rows, creates, updates, recorded } = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  creates: vi.fn(),
  updates: [] as Array<{ payload: Record<string, unknown>; id: string | null }>,
  recorded: [] as string[][][],
}));

function rowMatches(
  row: Record<string, unknown>,
  filters: string[][],
): boolean {
  for (const filter of filters) {
    const [op, column, extra, value] = filter;
    const cell = row[column];
    if (op === "eq" && String(cell) !== extra) return false;
    if (op === "neq" && String(cell) === extra) return false;
    if (op === "is" && extra === "null" && cell != null) return false;
    if (op === "not" && extra === "is" && value === "null" && cell == null) {
      return false;
    }
    if (op === "gt") {
      const created = new Date(String(cell)).getTime();
      if (!Number.isFinite(created) || created <= new Date(extra).getTime()) {
        return false;
      }
    }
    if (op === "lte") {
      const at = new Date(String(cell)).getTime();
      if (!Number.isFinite(at) || at > new Date(extra).getTime()) return false;
    }
  }
  return true;
}

function makeQuery() {
  const filters: string[][] = [];
  const query = {
    select() {
      return query;
    },
    eq(column: string, value: unknown) {
      filters.push(["eq", column, value == null ? "null" : String(value)]);
      return query;
    },
    neq(column: string, value: unknown) {
      filters.push(["neq", column, String(value)]);
      return query;
    },
    is(column: string, value: unknown) {
      filters.push(["is", column, value == null ? "null" : String(value)]);
      return query;
    },
    not(column: string, op: string, value: unknown) {
      filters.push([
        "not",
        column,
        op,
        value == null ? "null" : String(value),
      ]);
      return query;
    },
    gt(column: string, value: unknown) {
      filters.push(["gt", column, String(value)]);
      return query;
    },
    lte(column: string, value: unknown) {
      filters.push(["lte", column, String(value)]);
      return query;
    },
    update(payload: Record<string, unknown>) {
      const call = { payload, id: null as string | null };
      updates.push(call);
      return {
        eq: async (_column: string, id: string) => {
          call.id = id;
          return { error: null };
        },
      };
    },
    maybeSingle() {
      const id = filters.find((filter) => filter[0] === "eq" && filter[1] === "id")?.[2];
      const row = rows.find((item) => item.id === id) ?? null;
      return Promise.resolve({ data: row, error: null });
    },
    then(
      resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) {
      recorded.push(filters.map((filter) => [...filter]));
      return Promise.resolve({
        data: rows.filter((row) => rowMatches(row, filters)),
        error: null,
      }).then(resolve, reject);
    },
  };
  return query;
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => makeQuery(),
  }),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      create: (...args: unknown[]) => creates(...args),
      retrieve: async () => ({ amount: 1500 }),
    },
    setupIntents: {
      retrieve: async () => ({ metadata: { expected_amount_ore: "1500" } }),
    },
  },
}));

vi.mock("@/lib/stripe/customer", () => ({
  getOrCreateStripeCustomer: async () => "cus_test",
}));

vi.mock("@/lib/pallet-auto-management", () => ({
  cleanupEmptyPalletsAfterReservationChange: vi.fn(),
  releaseBookingsForReservationPallet: vi.fn(),
  updatePickupProducerForPallet: vi.fn(),
}));

vi.mock("@/lib/membership/pact-points-engine", () => ({
  confirmPendingRedemption: async () => ({ success: true }),
  reversePendingRedemption: vi.fn(),
}));

vi.mock("@/lib/sendgrid-service", () => ({
  sendPaymentCancelledEmail: vi.fn(),
  sendPaymentConfirmedEmail: vi.fn(),
}));

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hasLegalFilters(filters: string[][]): boolean {
  const blockedNull = filters
    .filter((filter) => filter[0] === "not" && filter[2] === "is" && filter[3] === "null")
    .map((filter) => filter[1]);
  return (
    ["terms_version", "terms_accepted_at", "age_verified_at"].every((column) =>
      blockedNull.includes(column),
    ) && filters.some((filter) => filter[0] === "gt" && filter[1] === "created_at")
  );
}

const now = new Date("2026-10-28T12:00:00.000Z");

function isoDaysBefore(days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

const completeSnapshot = {
  terms_version: "2026-08-25",
  terms_accepted_at: isoDaysBefore(89),
  age_verified_at: isoDaysBefore(89),
  created_at: isoDaysBefore(89),
};

describe("isChargeEligible", () => {
  it("accepts a complete snapshot that is 89 days old", () => {
    expect(isChargeEligible(completeSnapshot, now)).toEqual({ ok: true });
  });

  it("rejects the same snapshot at 91 days", () => {
    expect(
      isChargeEligible(
        { ...completeSnapshot, created_at: isoDaysBefore(91) },
        now,
      ),
    ).toEqual({ ok: false, reason: "reservation_expired" });
  });

  it("rejects a missing age check", () => {
    expect(
      isChargeEligible({ ...completeSnapshot, age_verified_at: null }, now),
    ).toEqual({ ok: false, reason: "age_missing" });
  });

  it("rejects a missing terms snapshot", () => {
    expect(
      isChargeEligible({ ...completeSnapshot, terms_version: null }, now),
    ).toEqual({ ok: false, reason: "terms_missing" });
    expect(
      isChargeEligible({ ...completeSnapshot, terms_accepted_at: null }, now),
    ).toEqual({ ok: false, reason: "terms_missing" });
  });
});

describe("charge selection", () => {
  beforeEach(() => {
    rows.splice(0, rows.length);
    updates.splice(0, updates.length);
    recorded.splice(0, recorded.length);
    creates.mockReset();
    creates.mockResolvedValue({ id: "pi_test", status: "succeeded" });
  });

  it("does not select the current unapproved setup-intent rows and never calls Stripe", async () => {
    rows.push(
      {
        id: "live-shape",
        user_id: "user-1",
        pallet_id: "pallet-1",
        status: "pending_producer_approval",
        payment_mode: "setup_intent",
        payment_status: "pending",
        payment_method_id: "pm_live",
        setup_intent_id: "seti_live",
        payment_attempts: 0,
        is_conditional: false,
        charge_blocked_reason: null,
        terms_version: null,
        terms_accepted_at: null,
        age_verified_at: null,
        created_at: daysAgo(120),
      },
      {
        id: "eligible-89",
        user_id: "user-1",
        pallet_id: "pallet-1",
        status: "pending_producer_approval",
        payment_mode: "setup_intent",
        payment_status: "pending",
        payment_method_id: "pm_ok",
        setup_intent_id: "seti_ok",
        payment_attempts: 0,
        is_conditional: false,
        charge_blocked_reason: null,
        terms_version: "2026-08-25",
        terms_accepted_at: daysAgo(10),
        age_verified_at: daysAgo(10),
        created_at: daysAgo(89),
      },
    );

    const { autoChargeDeferredReservationsForPallet } = await import(
      "@/lib/reservation-auto-charge"
    );
    const result = await autoChargeDeferredReservationsForPallet("pallet-1");

    expect(recorded.some(hasLegalFilters)).toBe(true);
    expect(result.skipped).toEqual([
      { id: "live-shape", reason: "terms_missing" },
    ]);
    expect(result.charged).toBe(1);
    expect(creates).toHaveBeenCalledTimes(1);
    expect(creates.mock.calls[0]?.[0]).toMatchObject({
      metadata: { reservation_id: "eligible-89" },
    });
    expect(
      updates.some(
        (call) =>
          call.id === "live-shape" ||
          call.payload.payment_attempts != null ||
          call.payload.payment_status === "failed",
      ),
    ).toBe(false);
  });

  it("does not retry a reservation that fails the same guard", async () => {
    rows.push(
      {
        id: "retry-old",
        user_id: "user-1",
        pallet_id: "pallet-1",
        status: "pending_producer_approval",
        payment_mode: "setup_intent",
        payment_status: "failed",
        payment_method_id: "pm_old",
        setup_intent_id: "seti_old",
        payment_attempts: 1,
        retry_scheduled_at: daysAgo(1),
        is_conditional: false,
        charge_blocked_reason: null,
        terms_version: null,
        terms_accepted_at: null,
        age_verified_at: null,
        created_at: daysAgo(120),
      },
      {
        id: "retry-89",
        user_id: "user-1",
        pallet_id: "pallet-1",
        status: "pending_producer_approval",
        payment_mode: "setup_intent",
        payment_status: "failed",
        payment_method_id: "pm_ok",
        setup_intent_id: "seti_ok",
        payment_attempts: 1,
        retry_scheduled_at: daysAgo(1),
        is_conditional: false,
        charge_blocked_reason: null,
        terms_version: "2026-08-25",
        terms_accepted_at: daysAgo(10),
        age_verified_at: daysAgo(10),
        created_at: daysAgo(89),
      },
    );

    const { retryFailedPayments } = await import("@/lib/payment-retry");
    await retryFailedPayments();

    expect(recorded.some(hasLegalFilters)).toBe(true);
    expect(creates).toHaveBeenCalledTimes(1);
    expect(creates.mock.calls[0]?.[0]).toMatchObject({
      metadata: { reservation_id: "retry-89" },
    });
    expect(updates.some((call) => call.id === "retry-old")).toBe(false);
  });

  it("stops chargeOne before Stripe when age verification is missing", async () => {
    const { chargeOneSetupIntentReservation } = await import(
      "@/lib/reservation-auto-charge"
    );
    const outcome = await chargeOneSetupIntentReservation("pallet-1", {
      id: "age-missing",
      user_id: "user-1",
      payment_mode: "setup_intent",
      payment_status: "pending",
      payment_method_id: "pm_1",
      setup_intent_id: "seti_1",
      payment_attempts: 0,
      terms_version: "2026-08-25",
      terms_accepted_at: daysAgo(10),
      age_verified_at: null,
      created_at: daysAgo(10),
    });

    expect(outcome).toEqual({ id: "age-missing", reason: "age_missing" });
    expect(creates).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });
});
