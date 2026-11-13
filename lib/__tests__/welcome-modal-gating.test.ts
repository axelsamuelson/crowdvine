import { afterEach, describe, expect, it } from "vitest";
import { isWelcomeModalEnabled } from "@/lib/onboarding/welcome-modal-flag";
import {
  isWelcomeCartPath,
  isWelcomeCheckoutPath,
  isWelcomeModalAllowedPath,
  isWelcomeModalBlockedPath,
  isWelcomePdpPath,
  isWelcomeStartPath,
  isWelcomeWineListPath,
} from "@/lib/onboarding/welcome-modal-routes";
import {
  readWelcomeSeenLocal,
  welcomeSeenStorageKey,
  writeWelcomeSeenLocal,
} from "@/lib/onboarding/welcome-modal-seen";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("welcome modal feature flag (default OFF)", () => {
  afterEach(() => {
    delete process.env.WELCOME_MODAL_ENABLED;
    delete process.env.NEXT_PUBLIC_WELCOME_MODAL_ENABLED;
  });

  it("is off when unset", () => {
    delete process.env.WELCOME_MODAL_ENABLED;
    delete process.env.NEXT_PUBLIC_WELCOME_MODAL_ENABLED;
    expect(isWelcomeModalEnabled({})).toBe(false);
  });

  it("turns on with WELCOME_MODAL_ENABLED or NEXT_PUBLIC_", () => {
    expect(isWelcomeModalEnabled({ WELCOME_MODAL_ENABLED: "true" })).toBe(true);
    expect(
      isWelcomeModalEnabled({ NEXT_PUBLIC_WELCOME_MODAL_ENABLED: "true" }),
    ).toBe(true);
    expect(isWelcomeModalEnabled({ WELCOME_MODAL_ENABLED: "false" })).toBe(
      false,
    );
  });
});

describe("welcome modal route gates", () => {
  it("allows start page and wine list only", () => {
    expect(isWelcomeStartPath("/")).toBe(true);
    expect(isWelcomeStartPath("/en")).toBe(true);
    expect(isWelcomeWineListPath("/vin")).toBe(true);
    expect(isWelcomeWineListPath("/wine")).toBe(true);
    expect(isWelcomeModalAllowedPath("/")).toBe(true);
    expect(isWelcomeModalAllowedPath("/vin")).toBe(true);
    expect(isWelcomeModalAllowedPath("/vin/rott-naturvin")).toBe(false);
    expect(isWelcomeModalAllowedPath("/wine/red-natural-wine")).toBe(false);
    expect(isWelcomeModalAllowedPath("/profile")).toBe(false);
  });

  it("blocks PDP, cart, and checkout", () => {
    expect(isWelcomePdpPath("/produkt/some-wine")).toBe(true);
    expect(isWelcomePdpPath("/product/some-wine")).toBe(true);
    expect(isWelcomeCheckoutPath("/checkout")).toBe(true);
    expect(isWelcomeCheckoutPath("/en/checkout/confirm")).toBe(true);
    expect(isWelcomeCartPath("/cart")).toBe(true);
    expect(isWelcomeModalBlockedPath("/product/abc")).toBe(true);
    expect(isWelcomeModalBlockedPath("/checkout")).toBe(true);
    expect(isWelcomeModalBlockedPath("/")).toBe(false);
  });
});

describe("welcome seen localStorage keyed by user id", () => {
  it("stores and reads per user", () => {
    const store = new Map<string, string>();
    const ls = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    // jsdom may not exist — exercise key helper + pure logic via mock window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = { localStorage: ls };
    writeWelcomeSeenLocal("user-a");
    expect(store.get(welcomeSeenStorageKey("user-a"))).toBe("1");
    expect(readWelcomeSeenLocal("user-a")).toBe(true);
    expect(readWelcomeSeenLocal("user-b")).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
  });
});

describe("welcome modal mount wiring", () => {
  it("provider mounts WelcomeModal and never pushes /onboarding", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/onboarding/onboarding-provider.tsx"),
      "utf8",
    );
    expect(src).toMatch(/WelcomeModal/);
    expect(src).toMatch(/isWelcomeModalEnabled/);
    expect(src).toMatch(/isWelcomeModalAllowedPath/);
    expect(src).toMatch(/onboarding_seen|fetchWelcomeSeen|markWelcomeSeenRemote/);
    expect(src).not.toMatch(/push\s*\(\s*["']\/onboarding["']/);
    // Never render modal tree for anonymous visitors — members only.
    expect(src).toMatch(/mayRenderModal/);
    expect(src).toMatch(/isMember/);
    expect(src).toMatch(/cart-drawer-state|cartOpen/);
  });

  it("root layout passes welcomeModalEnabled from the server (client env is empty)", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "app/layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/isWelcomeModalEnabled/);
    expect(layout).toMatch(/welcomeModalEnabled=\{isWelcomeModalEnabled\(\)\}/);
  });

  it("modal tracks required events and uses earningEnabled", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/onboarding/welcome-modal.tsx"),
      "utf8",
    );
    expect(src).toMatch(/welcome_shown/);
    expect(src).toMatch(/welcome_step_viewed/);
    expect(src).toMatch(/welcome_dismissed/);
    expect(src).toMatch(/welcome_cta_clicked/);
    expect(src).toMatch(/earningEnabled/);
  });

  it("step 1 subtitle uses text-balance and body max-width to avoid orphans", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/onboarding/welcome-modal.tsx"),
      "utf8",
    );
    expect(src).toMatch(
      /step\.subtitle[\s\S]{0,200}?className="[^"]*max-w-md[^"]*text-balance/,
    );
  });
});
