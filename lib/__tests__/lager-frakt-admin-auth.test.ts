import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireAdmin = vi.fn();

vi.mock("@/lib/admin-auth-server", () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
  getCurrentAdmin: vi.fn(),
  AdminAuthError: class AdminAuthError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "AdminAuthError";
      this.status = status;
    }
  },
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => {
    throw new Error("getSupabaseAdmin should not run without admin");
  },
}));

vi.mock("@/lib/driving-routes", () => ({
  fetchDrivingRoutesFromPickup: vi.fn(),
  findOptimalPickupByAverageDriveTime: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Lager & Frakt admin auth — unauthenticated denial", () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    requireAdmin.mockRejectedValue(new Error("Admin authentication required"));
  });

  it("denies deleteGeoZone without admin", async () => {
    const { deleteGeoZone } = await import("@/lib/actions/geo-zones");
    await expect(deleteGeoZone("00000000-0000-0000-0000-000000000001")).rejects.toThrow(
      "Admin authentication required",
    );
    expect(requireAdmin).toHaveBeenCalledOnce();
  });

  it("denies createPalletZone without admin", async () => {
    const { createPalletZone } = await import("@/lib/actions/zones");
    await expect(
      createPalletZone({
        name: "x",
        radius_km: 10,
        center_lat: 59,
        center_lon: 18,
        zone_type: "pickup",
      }),
    ).rejects.toThrow("Admin authentication required");
  });

  it("denies updatePalletZone without admin", async () => {
    const { updatePalletZone } = await import("@/lib/actions/zones");
    await expect(
      updatePalletZone("00000000-0000-0000-0000-000000000001", { name: "y" }),
    ).rejects.toThrow("Admin authentication required");
  });

  it("denies deletePalletZone without admin", async () => {
    const { deletePalletZone } = await import("@/lib/actions/zones");
    await expect(
      deletePalletZone("00000000-0000-0000-0000-000000000001"),
    ).rejects.toThrow("Admin authentication required");
  });

  it("denies getPalletZone / list helpers without admin", async () => {
    const zones = await import("@/lib/actions/zones");
    await expect(zones.getDeliveryZones()).rejects.toThrow(
      "Admin authentication required",
    );
    await expect(zones.getPickupZones()).rejects.toThrow(
      "Admin authentication required",
    );
    await expect(zones.getPalletZones()).rejects.toThrow(
      "Admin authentication required",
    );
    await expect(
      zones.getPalletZone("00000000-0000-0000-0000-000000000001"),
    ).rejects.toThrow("Admin authentication required");
  });

  it("returns 401 from b2b routing without admin", async () => {
    const { POST } = await import("@/app/api/admin/b2b-pallet-routing/route");
    const req = new NextRequest("http://localhost/api/admin/b2b-pallet-routing", {
      method: "POST",
      body: JSON.stringify({
        pickup: { lat: 59.3, lon: 18.0 },
        destinations: [],
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Admin authentication required");
  });

  it("returns 401 from optimal-pickup without admin", async () => {
    const { POST } = await import(
      "@/app/api/admin/b2b-pallet-routing/optimal-pickup/route"
    );
    const req = new NextRequest(
      "http://localhost/api/admin/b2b-pallet-routing/optimal-pickup",
      {
        method: "POST",
        body: JSON.stringify({
          producers: [
            { id: "a", lat: 59.3, lon: 18.0 },
            { id: "b", lat: 59.4, lon: 18.1 },
          ],
        }),
        headers: { "content-type": "application/json" },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Admin authentication required");
  });

  it("returns 401 from GET /api/admin/zones without admin", async () => {
    const { GET } = await import("@/app/api/admin/zones/route");
    const req = new NextRequest("http://localhost/api/admin/zones?type=pickup");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 from POST /api/admin/zones/for-producer without admin", async () => {
    const { POST } = await import("@/app/api/admin/zones/for-producer/route");
    const req = new Request("http://localhost/api/admin/zones/for-producer", {
      method: "POST",
      body: JSON.stringify({
        producerId: "p1",
        zoneData: { name: "z", lat: 59, lon: 18 },
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 from geo-zones and shipping-regions APIs without admin", async () => {
    const geo = await import("@/app/api/admin/geo-zones/route");
    const geoId = await import("@/app/api/admin/geo-zones/[id]/route");
    const regions = await import("@/app/api/admin/shipping-regions/route");
    const regionId = await import("@/app/api/admin/shipping-regions/[id]/route");

    const getReq = new NextRequest("http://localhost/api/admin/geo-zones");
    expect((await geo.GET(getReq)).status).toBe(401);

    const postReq = new NextRequest("http://localhost/api/admin/geo-zones", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    expect((await geo.POST(postReq)).status).toBe(401);

    const patchReq = new NextRequest(
      "http://localhost/api/admin/geo-zones/00000000-0000-0000-0000-000000000001",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "x" }),
        headers: { "content-type": "application/json" },
      },
    );
    expect(
      (
        await geoId.PATCH(patchReq, {
          params: Promise.resolve({
            id: "00000000-0000-0000-0000-000000000001",
          }),
        })
      ).status,
    ).toBe(401);

    expect(
      (
        await geoId.DELETE(patchReq, {
          params: Promise.resolve({
            id: "00000000-0000-0000-0000-000000000001",
          }),
        })
      ).status,
    ).toBe(401);

    expect((await regions.GET()).status).toBe(401);
    expect(
      (
        await regions.POST(
          new NextRequest("http://localhost/api/admin/shipping-regions", {
            method: "POST",
            body: JSON.stringify({ name: "x", country_code: "FR" }),
            headers: { "content-type": "application/json" },
          }),
        )
      ).status,
    ).toBe(401);

    const regionParams = {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000001" }),
    };
    expect(
      (
        await regionId.GET(
          new NextRequest(
            "http://localhost/api/admin/shipping-regions/00000000-0000-0000-0000-000000000001",
          ),
          regionParams,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await regionId.PATCH(
          new NextRequest(
            "http://localhost/api/admin/shipping-regions/00000000-0000-0000-0000-000000000001",
            {
              method: "PATCH",
              body: JSON.stringify({ name: "y" }),
              headers: { "content-type": "application/json" },
            },
          ),
          regionParams,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await regionId.DELETE(
          new NextRequest(
            "http://localhost/api/admin/shipping-regions/00000000-0000-0000-0000-000000000001",
            { method: "DELETE" },
          ),
          regionParams,
        )
      ).status,
    ).toBe(401);
  });
});
