import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_STARTED_KEY,
  ageVerificationShownKey,
  clearCheckoutAnalyticsSession,
  clearClaim,
  emitOnce,
  getCheckoutSessionId,
  resetEmitOnceForTests,
  termsAcceptedEmitKey,
} from "../emit-once";

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
  vi.stubGlobal("window", { sessionStorage: mock });
}

describe("emitOnce", () => {
  beforeEach(() => {
    installSessionStorageMock();
    resetEmitOnceForTests();
  });

  afterEach(() => {
    resetEmitOnceForTests();
    vi.unstubAllGlobals();
  });

  it("runs fn only once for the same key", () => {
    const fn = vi.fn();
    expect(emitOnce("k1", fn)).toBe(true);
    expect(emitOnce("k1", fn)).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("dedupes two calls in the same tick via memory Set", () => {
    const fn = vi.fn();
    emitOnce("same-tick", fn);
    emitOnce("same-tick", fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("age shown keys differ by country", () => {
    const id = getCheckoutSessionId();
    expect(ageVerificationShownKey("SE")).toBe(`age_shown:${id}:SE`);
    expect(ageVerificationShownKey("dk")).toBe(`age_shown:${id}:DK`);
    const se = vi.fn();
    const dk = vi.fn();
    emitOnce(ageVerificationShownKey("SE"), se);
    emitOnce(ageVerificationShownKey("DK"), dk);
    expect(se).toHaveBeenCalledTimes(1);
    expect(dk).toHaveBeenCalledTimes(1);
  });

  it("terms accepted fires once per checkout session", () => {
    const fn = vi.fn();
    emitOnce(termsAcceptedEmitKey(), fn);
    emitOnce(termsAcceptedEmitKey(), fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clearCheckoutAnalyticsSession allows re-emit", () => {
    const fn = vi.fn();
    emitOnce(CHECKOUT_STARTED_KEY, fn);
    emitOnce(termsAcceptedEmitKey(), fn);
    clearCheckoutAnalyticsSession();
    emitOnce(CHECKOUT_STARTED_KEY, fn);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("clearClaim frees a single key", () => {
    const fn = vi.fn();
    emitOnce("solo", fn);
    clearClaim("solo");
    emitOnce("solo", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
