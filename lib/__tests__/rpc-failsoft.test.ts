import { afterEach, describe, expect, it, vi } from "vitest";
import { createFailSoftLoader } from "@/lib/analytics/rpc-failsoft";

describe("createFailSoftLoader", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the loaded value on success", async () => {
    const load = createFailSoftLoader({
      label: "test",
      empty: {},
      load: async () => ({ ok: 1 }),
    });
    await expect(load()).resolves.toEqual({ ok: 1 });
  });

  it("single-flights concurrent callers", async () => {
    let calls = 0;
    const load = createFailSoftLoader({
      label: "test",
      empty: {},
      load: async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 20));
        return { n: calls };
      },
    });
    const [a, b] = await Promise.all([load(), load()]);
    expect(calls).toBe(1);
    expect(a).toEqual({ n: 1 });
    expect(b).toEqual({ n: 1 });
  });

  it("fail-softs on timeout and sticks empty for the process", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const load = createFailSoftLoader({
      label: "test",
      empty: { fallback: true },
      budgetMs: 30,
      load: async (signal) => {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => resolve(), 200);
          signal.addEventListener("abort", () => {
            clearTimeout(t);
            reject(signal.reason ?? new Error("aborted"));
          });
        });
        return { fallback: false };
      },
    });

    await expect(load()).resolves.toEqual({ fallback: true });
    // Sticky empty: second call must not re-enter load.
    let secondCalls = 0;
    const load2 = createFailSoftLoader({
      label: "test2",
      empty: { sticky: true },
      budgetMs: 30,
      load: async (signal) => {
        secondCalls += 1;
        await new Promise<void>((_, reject) => {
          signal.addEventListener("abort", () => {
            reject(signal.reason ?? new Error("aborted"));
          });
        });
        return { sticky: false };
      },
    });
    await expect(load2()).resolves.toEqual({ sticky: true });
    await expect(load2()).resolves.toEqual({ sticky: true });
    expect(secondCalls).toBe(1);
  });
});
