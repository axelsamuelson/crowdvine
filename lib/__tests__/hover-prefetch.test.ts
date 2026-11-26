import { describe, expect, it } from "vitest";

import {
  HOVER_PREFETCH_DELAY_MS,
  resetHoverPrefetchQueueForTests,
  scheduleHoverPrefetch,
} from "@/lib/navigation/hover-prefetch";

describe("scheduleHoverPrefetch", () => {
  it("waits 150ms and runs one prefetch at a time", async () => {
    resetHoverPrefetchQueueForTests();
    const started: string[] = [];
    const timers: Array<() => void> = [];
    let releaseFirst: () => void = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    scheduleHoverPrefetch({
      href: "/produkt/a",
      delayMs: HOVER_PREFETCH_DELAY_MS,
      schedule: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      cancelSchedule: () => {},
      prefetch: async (href) => {
        started.push(href);
        if (href.endsWith("/a")) await firstGate;
      },
    });
    scheduleHoverPrefetch({
      href: "/produkt/b",
      delayMs: HOVER_PREFETCH_DELAY_MS,
      schedule: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      cancelSchedule: () => {},
      prefetch: async (href) => {
        started.push(href);
      },
    });

    expect(started).toEqual([]);
    expect(HOVER_PREFETCH_DELAY_MS).toBe(150);
    timers[0]?.();
    timers[1]?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual(["/produkt/a"]);

    releaseFirst();
    for (let i = 0; i < 20 && started.length < 2; i++) {
      await Promise.resolve();
    }
    expect(started).toEqual(["/produkt/a", "/produkt/b"]);
  });

  it("does not prefetch when the pointer leaves before 150ms", async () => {
    resetHoverPrefetchQueueForTests();
    const started: string[] = [];
    let fire: (() => void) | null = null;
    const handle = scheduleHoverPrefetch({
      href: "/produkt/c",
      delayMs: 150,
      schedule: (fn) => {
        fire = fn;
        return 1;
      },
      cancelSchedule: () => {
        fire = null;
      },
      prefetch: async (href) => {
        started.push(href);
      },
    });
    handle.cancel();
    fire?.();
    await Promise.resolve();
    expect(started).toEqual([]);
  });
});
