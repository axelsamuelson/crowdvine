import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("GET /api/cron/reservation-expiry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  async function get(authHeader?: string) {
    const { GET } = await import("@/app/api/cron/reservation-expiry/route");
    const headers = new Headers();
    if (authHeader !== undefined) {
      headers.set("authorization", authHeader);
    }
    return GET(
      new NextRequest("http://localhost/api/cron/reservation-expiry", {
        method: "GET",
        headers,
      }),
    );
  }

  it("does not import or call the expiry job (safety net is a pure no-op)", () => {
    const src = readFileSync(
      path.join(
        process.cwd(),
        "app/api/cron/reservation-expiry/route.ts",
      ),
      "utf8",
    );
    expect(src).not.toMatch(/runReservationExpiryJob/);
    expect(src).not.toMatch(/from ["']@\/lib\/reservations\/expiry-run["']/);
  });

  it("returns disabled and does nothing when authorized with CRON_SECRET", async () => {
    const res = await get("Bearer test-cron-secret");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      disabled: true,
      reason: "shared pallet orders have no time limit (Axel 2026-11-10)",
    });
  });

  it("rejects unauthorized callers without running expiry work", async () => {
    const res = await get("Bearer wrong");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });
});
