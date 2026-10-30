import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKOUT_STARTED_KEY } from "../emit-once";
import {
  EXIT_FEEDBACK_SHOWN_KEY,
  getExitFeedbackSessionId,
  hasCheckoutStartedInSession,
  hasShownExitFeedback,
  isInternalExitFeedbackSession,
  markExitFeedbackShown,
  normalizeExitFeedbackAnswer,
  resolveExitFeedbackStep,
  sanitizeExitFeedbackPage,
  EXIT_FEEDBACK_ANSWER_MAX,
} from "../exit-feedback";

function installSessionStorageMock() {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  vi.stubGlobal("sessionStorage", mock);
  vi.stubGlobal("window", {
    sessionStorage: mock,
    location: { hostname: "pactwines.com", search: "" },
  });
  return store;
}

describe("exit-feedback helpers", () => {
  beforeEach(() => {
    installSessionStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a stable session id in sessionStorage", () => {
    const a = getExitFeedbackSessionId();
    const b = getExitFeedbackSessionId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });

  it("tracks shown flag once per session", () => {
    expect(hasShownExitFeedback()).toBe(false);
    markExitFeedbackShown();
    expect(hasShownExitFeedback()).toBe(true);
    expect(sessionStorage.getItem(EXIT_FEEDBACK_SHOWN_KEY)).toBe("1");
  });

  it("reads checkout_started from existing emit-once key", () => {
    expect(hasCheckoutStartedInSession()).toBe(false);
    sessionStorage.setItem(CHECKOUT_STARTED_KEY, "1");
    expect(hasCheckoutStartedInSession()).toBe(true);
  });

  it("prefers checkout step over cart", () => {
    expect(
      resolveExitFeedbackStep({ checkoutStarted: true, cartHasItems: true }),
    ).toBe("checkout");
    expect(
      resolveExitFeedbackStep({ checkoutStarted: false, cartHasItems: true }),
    ).toBe("cart");
    expect(
      resolveExitFeedbackStep({ checkoutStarted: false, cartHasItems: false }),
    ).toBeNull();
  });

  it("strips query/hash from page paths", () => {
    expect(sanitizeExitFeedbackPage("/checkout?email=a@b.com#x")).toBe(
      "/checkout",
    );
    expect(
      sanitizeExitFeedbackPage("https://pactwines.com/vin/foo?utm=1"),
    ).toBe("/vin/foo");
  });

  it("detects internal hosts and ?internal without writing storage", () => {
    expect(
      isInternalExitFeedbackSession({
        hostname: "localhost",
        search: "",
        isInternalDeviceFn: () => false,
      }),
    ).toBe(true);
    expect(
      isInternalExitFeedbackSession({
        hostname: "crowdvine-git-foo.vercel.app",
        search: "",
        isInternalDeviceFn: () => false,
      }),
    ).toBe(true);
    expect(
      isInternalExitFeedbackSession({
        hostname: "pactwines.com",
        search: "?internal=1",
        isInternalDeviceFn: () => false,
      }),
    ).toBe(true);
    expect(
      isInternalExitFeedbackSession({
        hostname: "pactwines.com",
        search: "",
        isInternalDeviceFn: () => true,
      }),
    ).toBe(true);
    expect(
      isInternalExitFeedbackSession({
        hostname: "pactwines.com",
        search: "",
        isInternalDeviceFn: () => false,
      }),
    ).toBe(false);
  });

  it("normalizes answers with length cap", () => {
    expect(normalizeExitFeedbackAnswer("  hej  ")).toBe("hej");
    expect(normalizeExitFeedbackAnswer("")).toBeNull();
    expect(normalizeExitFeedbackAnswer("   ")).toBeNull();
    expect(
      normalizeExitFeedbackAnswer("x".repeat(EXIT_FEEDBACK_ANSWER_MAX + 1)),
    ).toBeNull();
  });
});
