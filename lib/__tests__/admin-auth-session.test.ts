import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AdminAuthError } from "@/lib/admin-auth-server";

const getCurrentUser = vi.fn();
const maybeSingle = vi.fn();
const charge = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("next/headers", () => ({
  cookies: () => {
    throw new Error("admin auth must not read cookies");
  },
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => maybeSingle(),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/reservation-auto-charge", () => ({
  autoChargeDeferredReservationsForPallet: (...args: unknown[]) => charge(...args),
}));

vi.mock("@/lib/pallet-auto-management", () => ({
  updatePickupProducerForPallet: vi.fn(),
}));

describe("admin session auth", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    maybeSingle.mockReset();
    charge.mockReset();
  });

  it("ignores admin cookies when there is no session", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { getCurrentAdmin, requireAdmin } = await import(
      "@/lib/admin-auth-server"
    );

    await expect(getCurrentAdmin()).resolves.toBeNull();
    await expect(requireAdmin()).rejects.toMatchObject({
      status: 401,
      message: "Admin authentication required",
    });
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("returns 403 for a signed-in customer", async () => {
    getCurrentUser.mockResolvedValue({ id: "customer-1", email: "c@example.com" });
    maybeSingle.mockResolvedValue({
      data: {
        id: "customer-1",
        email: "c@example.com",
        role: "user",
        roles: ["user"],
      },
    });
    const { getCurrentAdmin, requireAdmin } = await import(
      "@/lib/admin-auth-server"
    );

    await expect(getCurrentAdmin()).resolves.toBeNull();
    await expect(requireAdmin()).rejects.toBeInstanceOf(AdminAuthError);
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
  });

  it("returns the admin for an admin session", async () => {
    getCurrentUser.mockResolvedValue({ id: "admin-1", email: "a@example.com" });
    maybeSingle.mockResolvedValue({
      data: {
        id: "admin-1",
        email: "a@example.com",
        role: "admin",
        roles: ["user"],
      },
    });
    const { getCurrentAdmin, requireAdmin } = await import(
      "@/lib/admin-auth-server"
    );

    const admin = {
      id: "admin-1",
      email: "a@example.com",
      role: "admin",
    };
    await expect(getCurrentAdmin()).resolves.toEqual(admin);
    await expect(requireAdmin()).resolves.toEqual(admin);
  });

  it("does not charge when order-shipping is called with only legacy cookies", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { POST } = await import(
      "@/app/api/admin/pallets/[id]/order-shipping/route"
    );
    const request = new NextRequest(
      "http://localhost/api/admin/pallets/not-a-real-pallet/order-shipping",
      {
        method: "POST",
        headers: {
          cookie: "admin-auth=true; admin-email=admin@example.com",
        },
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "not-a-real-pallet" }),
    });

    expect(response.status).toBe(401);
    expect(charge).not.toHaveBeenCalled();
  });
});
