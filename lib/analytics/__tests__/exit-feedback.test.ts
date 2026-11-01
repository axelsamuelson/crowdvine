import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHECKOUT_STARTED_KEY } from "../emit-once";
import {
  EXIT_FEEDBACK_ANSWERED_KEY,
  EXIT_FEEDBACK_DISMISS_DAYS,
  EXIT_FEEDBACK_DISMISS_UNTIL_KEY,
  EXIT_FEEDBACK_MIN_ACTIVE_MS,
  EXIT_FEEDBACK_REASONS,
  EXIT_FEEDBACK_REASON_OPTIONS,
  EXIT_FEEDBACK_SESSION_ID_KEY,
  getExitFeedbackSessionId,
  hasAnsweredExitFeedback,
  hasCheckoutStartedInSession,
  hasExitFeedbackTestOverride,
  hasMetExitFeedbackActiveTime,
  isExitFeedbackBlockedPath,
  isExitFeedbackDismissActive,
  isExitFeedbackReason,
  isInternalExitFeedbackSession,
  markExitFeedbackAnswered,
  markExitFeedbackDismissed,
  normalizeExitFeedbackAnswer,
  resolveExitFeedbackStep,
  sanitizeExitFeedbackPage,
  shouldSuppressExitFeedbackUi,
  EXIT_FEEDBACK_ANSWER_MAX,
} from "../exit-feedback";

function installLocalStorageMock() {
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
  const sessionStore = new Map<string, string>();
  const sessionMock: Storage = {
    get length() {
      return sessionStore.size;
    },
    clear() {
      sessionStore.clear();
    },
    getItem(key: string) {
      return sessionStore.has(key) ? sessionStore.get(key)! : null;
    },
    key(index: number) {
      return [...sessionStore.keys()][index] ?? null;
    },
    removeItem(key: string) {
      sessionStore.delete(key);
    },
    setItem(key: string, value: string) {
      sessionStore.set(key, String(value));
    },
  };
  vi.stubGlobal("localStorage", mock);
  vi.stubGlobal("sessionStorage", sessionMock);
  vi.stubGlobal("window", {
    localStorage: mock,
    sessionStorage: sessionMock,
    location: { hostname: "pactwines.com", search: "", pathname: "/vin" },
  });
  return { store, sessionStore };
}

describe("exit-feedback helpers", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("1) suppresses for admin, internal device, and /admin paths", () => {
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        search: "",
        pathname: "/vin",
        isAdmin: true,
        isInternalDeviceFn: () => false,
        ignoreLocalPersistence: true,
      }),
    ).toBe(true);
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        search: "",
        pathname: "/vin",
        isAdmin: false,
        isInternalDeviceFn: () => true,
        ignoreLocalPersistence: true,
      }),
    ).toBe(true);
    expect(isExitFeedbackBlockedPath("/admin")).toBe(true);
    expect(isExitFeedbackBlockedPath("/admin/pallets")).toBe(true);
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        pathname: "/admin/wines",
        isInternalDeviceFn: () => false,
        ignoreLocalPersistence: true,
      }),
    ).toBe(true);
  });

  it("1b) exit_test does not override admin or answered", () => {
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        search: "?exit_test=1",
        pathname: "/vin",
        isAdmin: true,
        isInternalDeviceFn: () => false,
        ignoreLocalPersistence: true,
      }),
    ).toBe(true);
    markExitFeedbackAnswered();
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        search: "?exit_test=1",
        pathname: "/vin",
        isInternalDeviceFn: () => false,
      }),
    ).toBe(true);
  });

  it("2) answered in localStorage never shows again", () => {
    expect(hasAnsweredExitFeedback()).toBe(false);
    markExitFeedbackAnswered();
    expect(hasAnsweredExitFeedback()).toBe(true);
    expect(localStorage.getItem(EXIT_FEEDBACK_ANSWERED_KEY)).toBe("1");
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        pathname: "/vin",
        isInternalDeviceFn: () => false,
      }),
    ).toBe(true);
  });

  it("2b) profileAnswered suppresses even without local flag", () => {
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        pathname: "/vin",
        profileAnswered: true,
        isInternalDeviceFn: () => false,
        ignoreLocalPersistence: true,
      }),
    ).toBe(true);
  });

  it("3) soft dismiss lasts at least 30 days via localStorage timestamp", () => {
    const now = Date.parse("2026-10-31T12:00:00.000Z");
    markExitFeedbackDismissed(now, EXIT_FEEDBACK_DISMISS_DAYS);
    const until = localStorage.getItem(EXIT_FEEDBACK_DISMISS_UNTIL_KEY);
    expect(until).toBeTruthy();
    expect(isExitFeedbackDismissActive(now + 1000)).toBe(true);
    expect(
      isExitFeedbackDismissActive(
        now + EXIT_FEEDBACK_DISMISS_DAYS * 24 * 60 * 60 * 1000 - 1000,
      ),
    ).toBe(true);
    expect(
      isExitFeedbackDismissActive(
        now + EXIT_FEEDBACK_DISMISS_DAYS * 24 * 60 * 60 * 1000 + 1000,
      ),
    ).toBe(false);
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        pathname: "/vin",
        isInternalDeviceFn: () => false,
      }),
    ).toBe(true);
  });

  it("3b) session id uses localStorage not sessionStorage shown flag", () => {
    const a = getExitFeedbackSessionId();
    const b = getExitFeedbackSessionId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(localStorage.getItem(EXIT_FEEDBACK_SESSION_ID_KEY)).toBe(a);
  });

  it("4) blocks checkout, payment, cart; requires 25s active time", () => {
    expect(isExitFeedbackBlockedPath("/checkout")).toBe(true);
    expect(isExitFeedbackBlockedPath("/checkout/success")).toBe(true);
    expect(isExitFeedbackBlockedPath("/payment")).toBe(true);
    expect(isExitFeedbackBlockedPath("/payment/return")).toBe(true);
    expect(isExitFeedbackBlockedPath("/cart")).toBe(true);
    expect(isExitFeedbackBlockedPath("/cart/share")).toBe(true);
    expect(isExitFeedbackBlockedPath("/vin")).toBe(false);
    expect(hasMetExitFeedbackActiveTime(0)).toBe(false);
    expect(
      hasMetExitFeedbackActiveTime(EXIT_FEEDBACK_MIN_ACTIVE_MS - 1),
    ).toBe(false);
    expect(hasMetExitFeedbackActiveTime(EXIT_FEEDBACK_MIN_ACTIVE_MS)).toBe(
      true,
    );
  });

  it("5) suppresses on B2B / dirtywine host flag", () => {
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "dirtywine.se",
        pathname: "/vin",
        isB2B: true,
        isInternalDeviceFn: () => false,
        ignoreLocalPersistence: true,
      }),
    ).toBe(true);
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "pactwines.com",
        pathname: "/vin",
        isB2B: false,
        isInternalDeviceFn: () => false,
        ignoreLocalPersistence: true,
      }),
    ).toBe(false);
  });

  it("prefers checkout step over cart when labeling", () => {
    expect(
      resolveExitFeedbackStep({ checkoutStarted: true, cartHasItems: true }),
    ).toBe("checkout");
    expect(
      resolveExitFeedbackStep({ checkoutStarted: false, cartHasItems: true }),
    ).toBe("cart");
  });

  it("reads checkout_started from existing emit-once session key", () => {
    expect(hasCheckoutStartedInSession()).toBe(false);
    sessionStorage.setItem(CHECKOUT_STARTED_KEY, "1");
    expect(hasCheckoutStartedInSession()).toBe(true);
  });

  it("strips query/hash from page paths", () => {
    expect(sanitizeExitFeedbackPage("/checkout?email=a@b.com#x")).toBe(
      "/checkout",
    );
  });

  it("detects internal hosts; exit_test bypasses host suppress only", () => {
    expect(
      isInternalExitFeedbackSession({
        hostname: "localhost",
        search: "",
        isInternalDeviceFn: () => false,
      }),
    ).toBe(true);
    expect(hasExitFeedbackTestOverride("?exit_test=1")).toBe(true);
    expect(
      shouldSuppressExitFeedbackUi({
        hostname: "localhost",
        search: "?exit_test=1",
        pathname: "/vin",
        isInternalDeviceFn: () => false,
        ignoreLocalPersistence: true,
      }),
    ).toBe(false);
  });

  it("normalizes answers and exposes reason codes", () => {
    expect(normalizeExitFeedbackAnswer("  hej  ")).toBe("hej");
    expect(
      normalizeExitFeedbackAnswer("x".repeat(EXIT_FEEDBACK_ANSWER_MAX + 1)),
    ).toBeNull();
    expect(EXIT_FEEDBACK_REASONS).toHaveLength(6);
    expect(EXIT_FEEDBACK_REASON_OPTIONS).toHaveLength(6);
    expect(isExitFeedbackReason("price")).toBe(true);
  });
});
