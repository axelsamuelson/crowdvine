import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const runReservationExpiryJob = vi.fn();
const getReservationExpiryConfig = vi.fn();

vi.mock("@/lib/reservations/expiry-run", () => ({
  runReservationExpiryJob: (...args: unknown[]) =>
    runReservationExpiryJob(...args),
}));

vi.mock("@/lib/reservations/expiry-config", () => ({
  getReservationExpiryConfig: (...args: unknown[]) =>
    getReservationExpiryConfig(...args),
}));

describe("GET /api/cron/reservation-expiry", () => {
  beforeEach(() => {
    vi.resetModules();
    runReservationExpiryJob.mockReset();
    getReservationExpiryConfig.mockReset();
    getReservationExpiryConfig.mockReturnValue({
      enabled: true,
      dryRun: false,
      sendEmail: false,
      statusIntervalDays: 28,
      extensionDays: 28,
      replyDays: 7,
      maxAgeDays: null,
    });
    runReservationExpiryJob.mockResolvedValue({
      enabled: true,
      dryRun: false,
      sendEmail: false,
      scanned: 12,
      skipped: 2,
      waits: 7,
      wouldSendStatusEmails: 3,
      statusEmailsSent: 0,
      statusEmails: 3,
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

  it("returns dry-run summary with wouldSend counts when sendEmail is off", async () => {
    const res = await get("Bearer test-cron-secret");
    expect(res.status).toBe(200);
    expect(runReservationExpiryJob).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.mode).toBe("status_email");
    expect(body.sendEmail).toBe(false);
    expect(body.dryRunSummary.wouldSendStatusEmails).toBe(3);
    expect(body.dryRunSummary.statusEmailsSent).toBe(0);
    expect(body.dryRunSummary.cancelledNoReply).toBe(0);
    expect(body.dryRunSummary.note).toMatch(/RESERVATION_EXPIRY_SEND_EMAIL/);
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
