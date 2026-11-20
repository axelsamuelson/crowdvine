import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * After ensure-session hotfix (#246): existing-account emails return 409
 * requiresLogin. Guest checkout must route that to CheckoutEmailAuth (OTP),
 * never silently setSession.
 */
describe("guest checkout respects ensure-session requiresLogin", () => {
  const clientSrc = readFileSync(
    join(process.cwd(), "app/checkout/checkout-client.tsx"),
    "utf8",
  );
  const routeSrc = readFileSync(
    join(process.cwd(), "app/api/checkout/ensure-session/route.ts"),
    "utf8",
  );

  it("client treats 409 / requiresLogin as OTP wall (guestRequiresLogin)", () => {
    expect(clientSrc).toContain("guestRequiresLogin");
    expect(clientSrc).toMatch(/res\.status === 409 \|\| data\?\.requiresLogin/);
    expect(clientSrc).toContain("setGuestRequiresLogin(true)");
    // OTP wall shown on silent path when requiresLogin
    expect(clientSrc).toContain("guestRequiresLogin ? (");
    expect(clientSrc).toContain("initialEmail=");
    expect(clientSrc).toContain("<CheckoutEmailAuth");
    // Final 409 explanatory copy (magic-link primary)
    expect(clientSrc).toContain('t("checkout.requiresLoginBody")');
  });

  it("messages include final requiresLoginBody copy (SV + EN)", () => {
    const sv = JSON.parse(
      readFileSync(join(process.cwd(), "messages/sv.json"), "utf8"),
    ) as { checkout: { requiresLoginBody: string } };
    const en = JSON.parse(
      readFileSync(join(process.cwd(), "messages/en.json"), "utf8"),
    ) as { checkout: { requiresLoginBody: string } };
    expect(sv.checkout.requiresLoginBody).toContain("inloggningslänk");
    expect(en.checkout.requiresLoginBody).toContain("sign-in link");
  });

  it("ensure-session keeps existingCheckoutEmailTaken → 409 and insert-only profiles", () => {
    expect(routeSrc).toContain("existingCheckoutEmailTaken");
    expect(routeSrc).toContain("requiresLoginResponse");
    expect(routeSrc).toContain("Insert-only");
    expect(routeSrc).toContain(".insert(profileInsert)");
    // Guest flag still allowed alongside PLATFORM_OPEN
    expect(routeSrc).toContain("isGuestCheckoutEnabled");
    expect(routeSrc).toContain("guest_checkout_at");
  });

  it("does not upsert role onto profiles in ensure-session", () => {
    expect(routeSrc).not.toMatch(/\.upsert\(\s*\{[\s\S]*role:\s*"user"/);
  });
});
