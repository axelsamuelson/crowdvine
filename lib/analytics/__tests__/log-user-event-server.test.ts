import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => fromMock(...args),
  }),
}));

describe("logUserEventServer", () => {
  beforeEach(() => {
    vi.resetModules();
    insertMock.mockReset();
    fromMock.mockReset();
    maybeSingleMock.mockReset();

    fromMock.mockImplementation((table: string) => {
      if (table === "admin_metrics_excluded_profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                maybeSingleMock.mockResolvedValue({
                  data: null,
                  error: { message: "relation does not exist" },
                })(),
            }),
          }),
        };
      }
      if (table === "user_events") {
        return {
          insert: (row: unknown) => insertMock(row),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
  });

  it("inserts production-shaped row when schema accepts it", async () => {
    insertMock.mockResolvedValueOnce({ error: null });
    const { logUserEventServer } = await import(
      "@/lib/analytics/log-user-event-server"
    );
    await logUserEventServer({
      userId: "user-1",
      eventType: "reservation_completed",
      eventCategory: "checkout",
      metadata: { reservation_id: "r1" },
    });
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(row.event_type).toBe("reservation_completed");
    expect(row.event_category).toBe("checkout");
    expect(row.session_id).toMatch(/^server_/);
    expect(row.user_id).toBe("user-1");
  });

  it("falls back to event_name stub when production columns are missing", async () => {
    insertMock
      .mockResolvedValueOnce({
        error: { message: "Could not find the 'event_type' column of 'user_events'" },
      })
      .mockResolvedValueOnce({
        error: { message: "Could not find the 'session_id' column of 'user_events'" },
      })
      .mockResolvedValueOnce({ error: null });

    const { logUserEventServer } = await import(
      "@/lib/analytics/log-user-event-server"
    );
    await logUserEventServer({
      userId: "user-2",
      eventType: "reservation_completed",
      eventCategory: "checkout",
      metadata: { reservation_id: "r2" },
    });

    expect(insertMock).toHaveBeenCalledTimes(3);
    const stub = insertMock.mock.calls[2]![0] as Record<string, unknown>;
    expect(stub).toEqual({
      user_id: "user-2",
      event_name: "reservation_completed",
      event_metadata: { reservation_id: "r2" },
    });
  });
});
