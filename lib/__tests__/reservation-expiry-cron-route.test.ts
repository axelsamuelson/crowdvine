import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const runReservationExpiryJob = vi.fn();

vi.mock("@/lib/reservations/expiry-run", () => ({
  runReservationExpiryJob: (...args: unknown[]) =>
    runReservationExpiryJob(...args),
}));

describe("GET /api/cron/reservation-expiry", () => {
  beforeEach(() => {
    vi.resetModules();
    runReservationExpiryJob.mockReset();
    runReservationExpiryJob.mockResolvedValue({
      enabled: true,
      dryRun: false,
      sendEmail: true,
      scanned: 0,
      skipped: 0,
      waits: 0,
      statusEmails: 0,
      asks: 0,
      cancelledNoReply: 0,
      hardExpired: 0,
      flaggedCharged: 0,
      errors: 0,
      actions: [],
    });
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

  it("runs the status-email job when authorized", async () => {
    const res = await get("Bearer test-cron-secret");
    expect(res.status).toBe(200);
    expect(runReservationExpiryJob).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.mode).toBe("status_email");
    expect(body.summary.cancelledNoReply).toBe(0);
    expect(body.summary.hardExpired).toBe(0);
  });

  it("rejects unauthorized callers without running the job", async () => {
    const res = await get("Bearer wrong");
    expect(res.status).toBe(200);
    expect(runReservationExpiryJob).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Unauthorized",
    });
  });
});
