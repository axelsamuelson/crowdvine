import { describe, expect, it } from "vitest";
import { isPlatformAdminProfile } from "@/lib/auth/platform-admin-profile";

describe("isPlatformAdminProfile", () => {
  it("returns false for null/undefined", () => {
    expect(isPlatformAdminProfile(null)).toBe(false);
    expect(isPlatformAdminProfile(undefined)).toBe(false);
  });

  it("accepts profiles.role = admin", () => {
    expect(
      isPlatformAdminProfile({ role: "admin", roles: ["user"] }),
    ).toBe(true);
  });

  it("accepts admin in profiles.roles when role is not admin", () => {
    expect(
      isPlatformAdminProfile({ role: "user", roles: ["user", "admin"] }),
    ).toBe(true);
  });

  it("rejects customers", () => {
    expect(isPlatformAdminProfile({ role: "user", roles: ["user"] })).toBe(
      false,
    );
    expect(isPlatformAdminProfile({ role: "producer", roles: null })).toBe(
      false,
    );
  });
});
