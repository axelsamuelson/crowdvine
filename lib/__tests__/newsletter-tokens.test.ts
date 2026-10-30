import { afterEach, describe, expect, it, vi } from "vitest";

describe("newsletter unsubscribe tokens", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("round-trips email and rejects tampering", async () => {
    vi.stubEnv("NEWSLETTER_UNSUB_SECRET", "test-secret-for-newsletter");
    const {
      createNewsletterUnsubscribeToken,
      verifyNewsletterUnsubscribeToken,
    } = await import("@/lib/newsletter/tokens");

    const token = createNewsletterUnsubscribeToken("User@Example.com");
    const ok = verifyNewsletterUnsubscribeToken(token);
    expect(ok).toEqual({ ok: true, email: "user@example.com" });

    const bad = verifyNewsletterUnsubscribeToken(token.slice(0, -2) + "aa");
    expect(bad.ok).toBe(false);
  });
});
