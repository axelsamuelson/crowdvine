import { describe, expect, it, vi } from "vitest";
import {
  shouldTrackPageViewNow,
  waitForTrackableDocument,
  type DocumentTrackingState,
} from "@/lib/analytics/should-track-page-view";

function mockDoc(
  state: {
    visibilityState?: string;
    prerendering?: boolean;
  },
): DocumentTrackingState & {
  listeners: Map<string, Set<() => void>>;
  emit: (type: string) => void;
} {
  const listeners = new Map<string, Set<() => void>>();
  const doc: DocumentTrackingState & {
    listeners: Map<string, Set<() => void>>;
    emit: (type: string) => void;
  } = {
    visibilityState: state.visibilityState,
    prerendering: state.prerendering,
    listeners,
    addEventListener(type, listener) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener as () => void);
      listeners.set(type, set);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener as () => void);
    },
    emit(type) {
      for (const fn of listeners.get(type) ?? []) fn();
    },
  };
  return doc;
}

describe("shouldTrackPageViewNow", () => {
  it("allows visible non-prerender documents", () => {
    expect(
      shouldTrackPageViewNow({
        visibilityState: "visible",
        prerendering: false,
      }),
    ).toBe(true);
  });

  it("blocks prerendering", () => {
    expect(
      shouldTrackPageViewNow({
        visibilityState: "visible",
        prerendering: true,
      }),
    ).toBe(false);
  });

  it("blocks hidden", () => {
    expect(
      shouldTrackPageViewNow({
        visibilityState: "hidden",
        prerendering: false,
      }),
    ).toBe(false);
  });
});

describe("waitForTrackableDocument", () => {
  it("resolves immediately when already trackable", async () => {
    const doc = mockDoc({ visibilityState: "visible", prerendering: false });
    await expect(waitForTrackableDocument({ doc })).resolves.toBe(true);
  });

  it("waits for prerenderingchange then tracks", async () => {
    const doc = mockDoc({ visibilityState: "visible", prerendering: true });
    const p = waitForTrackableDocument({ doc, timeoutMs: 1000 });
    doc.prerendering = false;
    doc.emit("prerenderingchange");
    await expect(p).resolves.toBe(true);
  });

  it("waits for visibilitychange when hidden", async () => {
    const doc = mockDoc({ visibilityState: "hidden", prerendering: false });
    const p = waitForTrackableDocument({ doc, timeoutMs: 1000 });
    doc.visibilityState = "visible";
    doc.emit("visibilitychange");
    await expect(p).resolves.toBe(true);
  });

  it("times out when never becomes trackable", async () => {
    vi.useFakeTimers();
    const doc = mockDoc({ visibilityState: "hidden", prerendering: true });
    const p = waitForTrackableDocument({ doc, timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(60);
    await expect(p).resolves.toBe(false);
    vi.useRealTimers();
  });
});
