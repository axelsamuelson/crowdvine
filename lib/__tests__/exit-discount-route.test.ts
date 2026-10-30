import { beforeEach, describe, expect, it, vi } from "vitest";

const insertPromo = vi.fn();
const insertLead = vi.fn();
const upsertConsent = vi.fn();
const sendEmail = vi.fn();

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "promo_discount_codes") {
        return {
          insert: (row: unknown) => ({
            select: () => ({
              single: async () => {
                insertPromo(row);
                return { data: { id: "promo-1" }, error: null };
              },
            }),
          }),
          delete: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "exit_discount_codes") {
        return {
          insert: (row: unknown) => ({
            select: () => ({
              single: async () => {
                insertLead(row);
                return { data: { id: "lead-1" }, error: null };
              },
            }),
          }),
        };
      }
      if (table === "newsletter_consents") {
        return {
          upsert: async (row: unknown) => {
            upsertConsent(row);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  defaultResendFrom: () => "PACT <noreply@pactwines.com>",
  defaultCustomerReplyTo: () => "customer@pactwines.com",
}));

describe("POST /api/exit-discount", () => {
  beforeEach(() => {
    vi.resetModules();
    insertPromo.mockReset();
    insertLead.mockReset();
    upsertConsent.mockReset();
    sendEmail.mockReset();
    sendEmail.mockResolvedValue({ id: "email-1" });
    vi.stubEnv("EXIT_DISCOUNT_ENABLED", "true");
    vi.stubEnv("NEWSLETTER_UNSUB_SECRET", "test-secret");
    vi.stubEnv("RESEND_API_KEY", "re_test");
  });

  async function post(body: unknown) {
    const { POST } = await import("@/app/api/exit-discount/route");
    return POST(
      new Request("http://localhost/api/exit-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("returns 404 when feature flag is off", async () => {
    vi.stubEnv("EXIT_DISCOUNT_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_EXIT_DISCOUNT_ENABLED", "false");
    const res = await post({
      email: "a@b.com",
      age_confirmed: true,
    });
    expect(res.status).toBe(404);
  });

  it("requires age confirmation and does not require newsletter", async () => {
    const missingAge = await post({
      email: "a@b.com",
      age_confirmed: false,
      newsletter_opt_in: true,
    });
    expect(missingAge.status).toBe(400);

    const ok = await post({
      email: "A@B.com",
      age_confirmed: true,
      newsletter_opt_in: false,
    });
    expect(ok.status).toBe(200);
    expect(upsertConsent).not.toHaveBeenCalled();
    expect(insertLead).toHaveBeenCalled();
    const lead = insertLead.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(lead.email).toBe("a@b.com");
    expect(lead).not.toHaveProperty("user_id");
    expect(sendEmail).toHaveBeenCalled();
    const mail = sendEmail.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(mail.from).toBe("PACT <customer@pactwines.com>");
  });
});
