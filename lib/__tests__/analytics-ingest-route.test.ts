import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => fromMock(...args),
  }),
}));

vi.mock("@/lib/rate-limiter", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rate-limiter")>(
    "@/lib/rate-limiter",
  );
  return {
    ...actual,
    analyticsIngestLimiter: {
      maxRequests: 180,
      isAllowed: () => true,
      getResetTime: () => Date.now() + 60_000,
      getRemainingRequests: () => 179,
      cleanup: () => undefined,
    },
  };
});

import { POST } from "@/app/api/e/route";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    user_id: null,
    session_id: "session_test_123456",
    visitor_id: "visitor_1",
    country_code: "SE",
    event_type: "checkout_started",
    event_category: "checkout",
    event_metadata: { cart_value: 100, site: "pact" },
    page_url: "https://dirtywine.se/checkout",
    referrer: null,
    user_agent: "vitest",
    ...overrides,
  };
}

describe("POST /api/e", () => {
  beforeEach(() => {
    insertMock.mockReset();
    fromMock.mockReset();
    fromMock.mockImplementation((table: string) => {
      if (table === "user_events") {
        return { insert: (row: unknown) => insertMock(row) };
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  it("writes host/site from Host header and overwrites metadata.site", async () => {
    insertMock.mockResolvedValueOnce({ error: null });
    const res = await POST(
      new Request("http://localhost/api/e", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "www.dirtywine.se",
        },
        body: JSON.stringify(validBody()),
      }),
    );
    expect(res.status).toBe(204);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.host).toBe("www.dirtywine.se");
    expect(row.site).toBe("dirtywine");
    expect((row.event_metadata as Record<string, unknown>).site).toBe(
      "dirtywine",
    );
    expect(row.event_type).toBe("checkout_started");
  });

  it("maps pactwines.com to pact", async () => {
    insertMock.mockResolvedValueOnce({ error: null });
    const res = await POST(
      new Request("http://localhost/api/e", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "pactwines.com",
        },
        body: JSON.stringify(validBody({ event_type: "page_view", event_category: "navigation" })),
      }),
    );
    expect(res.status).toBe(204);
    const row = insertMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.site).toBe("pact");
    expect(row.host).toBe("pactwines.com");
  });

  it("degrades when host/site columns are missing", async () => {
    insertMock
      .mockResolvedValueOnce({
        error: {
          message:
            "Could not find the 'host' column of 'user_events' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ error: null });

    const res = await POST(
      new Request("http://localhost/api/e", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "pactwines.com",
        },
        body: JSON.stringify(validBody()),
      }),
    );
    expect(res.status).toBe(204);
    expect(insertMock).toHaveBeenCalledTimes(2);
    const second = insertMock.mock.calls[1]![0] as Record<string, unknown>;
    expect(second).not.toHaveProperty("host");
    expect(second).not.toHaveProperty("site");
    expect((second.event_metadata as Record<string, unknown>).site).toBe(
      "pact",
    );
  });

  it("rejects invalid payloads", async () => {
    const res = await POST(
      new Request("http://localhost/api/e", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "pactwines.com",
        },
        body: JSON.stringify({ event_type: "nope" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies", async () => {
    const huge = "x".repeat(20 * 1024);
    const res = await POST(
      new Request("http://localhost/api/e", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          host: "pactwines.com",
        },
        body: JSON.stringify(validBody({ page_url: huge })),
      }),
    );
    expect(res.status).toBe(413);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
