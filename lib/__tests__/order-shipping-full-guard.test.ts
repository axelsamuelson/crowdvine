import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const fullnessCheck = vi.fn();
const charge = vi.fn();
const update = vi.fn();

vi.mock("@/lib/admin-auth-server", () => ({
  requireAdmin: async () => ({
    id: "admin-1",
    email: "a@example.com",
    role: "admin",
  }),
}));

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: async () => ({ id: "admin-1" }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "pallet-1",
              status: "open",
              current_pickup_producer_id: "prod-1",
              pickup_producer_confirmed_at: "2026-11-01T00:00:00.000Z",
            },
            error: null,
          }),
        }),
      }),
      update,
    }),
  }),
}));

vi.mock("@/lib/checkout/pallet-close/pallet-full", () => ({
  isSharedPalletFullForClose: (...args: unknown[]) => fullnessCheck(...args),
}));

vi.mock("@/lib/reservation-auto-charge", () => ({
  autoChargeDeferredReservationsForPallet: (...args: unknown[]) =>
    charge(...args),
}));

describe("POST /api/admin/pallets/:id/order-shipping fullness guard", () => {
  beforeEach(() => {
    fullnessCheck.mockReset();
    charge.mockReset();
    update.mockReset();
  });

  it("returns 409 and does not charge when the pallet is not full", async () => {
    fullnessCheck.mockResolvedValue({
      full: false,
      bottlesFilled: 40,
      minToShip: 180,
    });

    const { POST } = await import(
      "@/app/api/admin/pallets/[id]/order-shipping/route"
    );
    const request = new NextRequest(
      "http://localhost/api/admin/pallets/pallet-1/order-shipping",
      { method: "POST" },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "pallet-1" }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Pallet not full",
      bottlesFilled: 40,
      minToShip: 180,
    });
    expect(fullnessCheck).toHaveBeenCalledWith("pallet-1");
    expect(update).not.toHaveBeenCalled();
    expect(charge).not.toHaveBeenCalled();
  });
});
