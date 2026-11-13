import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireAdmin = vi.fn();

vi.mock("@/lib/admin-auth-server", () => {
  class AdminAuthError extends Error {
    status: 401 | 403;
    constructor(status: 401 | 403, message: string) {
      super(message);
      this.name = "AdminAuthError";
      this.status = status;
    }
  }
  return {
    requireAdmin: (...args: unknown[]) => requireAdmin(...args),
    getCurrentAdmin: vi.fn(),
    AdminAuthError,
  };
});

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => {
    throw new Error("getSupabaseAdmin should not run without admin");
  },
}));

describe("direct-box admin API auth denial", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    requireAdmin.mockRejectedValue(new Error("Admin authentication required"));
  });

  it("rejects non-admin PATCH fulfillment-dispatch", async () => {
    const { PATCH } = await import(
      "@/app/api/admin/reservations/[id]/fulfillment-dispatch/route"
    );
    const res = await PATCH(
      new NextRequest(
        "http://localhost/api/admin/reservations/r1/fulfillment-dispatch",
        {
          method: "PATCH",
          body: JSON.stringify({ status: "booked" }),
          headers: { "content-type": "application/json" },
        },
      ),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(res.status).toBe(401);
    expect(requireAdmin).toHaveBeenCalledOnce();
  });

  it("rejects non-admin GET and POST shipments", async () => {
    const { GET, POST } = await import(
      "@/app/api/admin/reservations/[id]/shipments/route"
    );
    const getRes = await GET(
      new NextRequest("http://localhost/api/admin/reservations/r1/shipments"),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(getRes.status).toBe(401);

    requireAdmin.mockClear();
    requireAdmin.mockRejectedValue(new Error("Admin authentication required"));

    const postRes = await POST(
      new NextRequest("http://localhost/api/admin/reservations/r1/shipments", {
        method: "POST",
        body: JSON.stringify({
          source_key: "producer:x",
          source_label: "X",
          tracking_number: "1Z",
          boxes: 1,
        }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "r1" }) },
    );
    expect(postRes.status).toBe(401);
  });

  it("rejects non-admin DELETE shipment", async () => {
    const { DELETE } = await import(
      "@/app/api/admin/reservations/[id]/shipments/[shipmentId]/route"
    );
    const res = await DELETE(
      new NextRequest(
        "http://localhost/api/admin/reservations/r1/shipments/s1",
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ id: "r1", shipmentId: "s1" }) },
    );
    expect(res.status).toBe(401);
  });
});
