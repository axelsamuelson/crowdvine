import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMenuPipelineAlertPayload,
  deliverMenuPipelineAlerts,
  sendMenuPipelineAlert,
  withMenuPipelineAlertBatch,
} from "../pipeline-alert-transport";

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "email-1" }),
}));

import { sendEmail } from "@/lib/email";

const sampleAlert = buildMenuPipelineAlertPayload(
  "[detect-menu-updates] Sitemap lastmod degenerate: 90% share on date 2026-06-15",
  ["90% of entries share lastmod date 2026-06-15.", "Using widget-feed lane."],
);

describe("deliverMenuPipelineAlerts transport selection", () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    warnSpy.mockClear();
  });

  it("email-only → sends one Resend email, no webhook", async () => {
    await deliverMenuPipelineAlerts([sampleAlert], {
      transport: { email: "ops@example.com", webhook: null },
      sendEmailFn: sendEmail,
      fetchFn: fetchMock,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@example.com",
        subject:
          "[CrowdVine pipeline] detect-menu-updates: Sitemap lastmod degenerate: 90% share on date 2026-06-15",
        text: expect.stringContaining("detect-menu-updates"),
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("webhook-only → posts to webhook, no email", async () => {
    await deliverMenuPipelineAlerts([sampleAlert], {
      transport: { email: null, webhook: "https://hooks.example/slack" },
      sendEmailFn: sendEmail,
      fetchFn: fetchMock,
    });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://hooks.example/slack",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Sitemap lastmod degenerate"),
      }),
    );
  });

  it("both configured → email and webhook fire", async () => {
    await deliverMenuPipelineAlerts([sampleAlert], {
      transport: {
        email: "ops@example.com",
        webhook: "https://hooks.example/slack",
      },
      sendEmailFn: sendEmail,
      fetchFn: fetchMock,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("neither configured → console.warn once, no transports", async () => {
    await deliverMenuPipelineAlerts([sampleAlert], {
      transport: { email: null, webhook: null },
      sendEmailFn: sendEmail,
      fetchFn: fetchMock,
    });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Alerting unconfigured"),
    );
  });
});

describe("withMenuPipelineAlertBatch", () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MENU_PIPELINE_ALERT_EMAIL", "ops@example.com");
    vi.stubEnv("MENU_PIPELINE_ALERT_WEBHOOK_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("batches multiple alerts into one email", async () => {
    await withMenuPipelineAlertBatch(async () => {
      await sendMenuPipelineAlert("[crawl-menus] Alert one", ["detail 1"]);
      await sendMenuPipelineAlert("[detect-menu-updates] Alert two", ["detail 2"]);
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]?.[0]?.subject).toContain("batch: 2 alerts");
    expect(sendEmail.mock.calls[0]?.[0]?.text).toContain("Alert one");
    expect(sendEmail.mock.calls[0]?.[0]?.text).toContain("Alert two");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
