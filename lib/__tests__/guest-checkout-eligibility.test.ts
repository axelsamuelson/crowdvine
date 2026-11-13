import { describe, expect, it } from "vitest";
import {
  isSwedishGuestCheckoutMarket,
  isUnclaimedGuestProfile,
  resolveGuestCheckoutAuthPath,
} from "@/lib/checkout/guest-checkout-eligibility";

describe("isSwedishGuestCheckoutMarket", () => {
  it("accepts SE only", () => {
    expect(isSwedishGuestCheckoutMarket("SE")).toBe(true);
    expect(isSwedishGuestCheckoutMarket("se")).toBe(true);
    expect(isSwedishGuestCheckoutMarket(" NO ")).toBe(false);
    expect(isSwedishGuestCheckoutMarket(null)).toBe(false);
    expect(isSwedishGuestCheckoutMarket(undefined)).toBe(false);
  });
});

describe("resolveGuestCheckoutAuthPath", () => {
  it("flag OFF + platformOpen false → login wall (unchanged)", () => {
    const path = resolveGuestCheckoutAuthPath({
      guestCheckoutEnabled: false,
      platformOpen: false,
      countryCode: "SE",
      authReady: false,
    });
    expect(path.showLoginWall).toBe(true);
    expect(path.useEnsureSession).toBe(false);
    expect(path.skipLoginWall).toBe(false);
  });

  it("flag OFF + platformOpen true → ensure-session, no wall (unchanged)", () => {
    const path = resolveGuestCheckoutAuthPath({
      guestCheckoutEnabled: false,
      platformOpen: true,
      countryCode: "SE",
      authReady: false,
    });
    expect(path.showLoginWall).toBe(false);
    expect(path.useEnsureSession).toBe(true);
    expect(path.skipLoginWall).toBe(true);
  });

  it("flag ON + SE + platformOpen false → no login wall, ensure-session", () => {
    const path = resolveGuestCheckoutAuthPath({
      guestCheckoutEnabled: true,
      platformOpen: false,
      countryCode: "SE",
      authReady: false,
    });
    expect(path.showLoginWall).toBe(false);
    expect(path.useEnsureSession).toBe(true);
    expect(path.skipLoginWall).toBe(true);
  });

  it("flag ON + SE + platformOpen true → no login wall, ensure-session", () => {
    const path = resolveGuestCheckoutAuthPath({
      guestCheckoutEnabled: true,
      platformOpen: true,
      countryCode: "SE",
      authReady: false,
    });
    expect(path.showLoginWall).toBe(false);
    expect(path.useEnsureSession).toBe(true);
  });

  it("flag ON + non-SE + platformOpen false → login wall (SE-only guest)", () => {
    const path = resolveGuestCheckoutAuthPath({
      guestCheckoutEnabled: true,
      platformOpen: false,
      countryCode: "NO",
      authReady: false,
    });
    expect(path.showLoginWall).toBe(true);
    expect(path.useEnsureSession).toBe(false);
  });

  it("flag ON + country unknown → no login wall (avoid OTP flash)", () => {
    const path = resolveGuestCheckoutAuthPath({
      guestCheckoutEnabled: true,
      platformOpen: false,
      countryCode: null,
      authReady: false,
    });
    expect(path.showLoginWall).toBe(false);
    expect(path.useEnsureSession).toBe(true);
  });

  it("authReady → never show wall or ensure-session", () => {
    const path = resolveGuestCheckoutAuthPath({
      guestCheckoutEnabled: true,
      platformOpen: false,
      countryCode: "SE",
      authReady: true,
    });
    expect(path.showLoginWall).toBe(false);
    expect(path.useEnsureSession).toBe(false);
    expect(path.skipLoginWall).toBe(true);
  });
});

describe("isUnclaimedGuestProfile", () => {
  it("true only when guest and not claimed", () => {
    expect(
      isUnclaimedGuestProfile({
        guestCheckoutAt: "2026-11-13T00:00:00Z",
        accountClaimedAt: null,
      }),
    ).toBe(true);
    expect(
      isUnclaimedGuestProfile({
        guestCheckoutAt: "2026-11-13T00:00:00Z",
        accountClaimedAt: "2026-11-13T01:00:00Z",
      }),
    ).toBe(false);
    expect(
      isUnclaimedGuestProfile({
        guestCheckoutAt: null,
        accountClaimedAt: null,
      }),
    ).toBe(false);
  });
});
