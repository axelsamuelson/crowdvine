import { beforeEach, describe, expect, it, vi } from "vitest";

const getCrowdvineProductByHandle = vi.fn();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/crowdvine/product-by-handle-data", () => ({
  getCrowdvineProductByHandle: (...args: unknown[]) =>
    getCrowdvineProductByHandle(...args),
}));

vi.mock("next/cache", () => ({
  // Run the loader immediately (no persistent cache in unit tests).
  unstable_cache: (fn: () => unknown) => () => fn(),
}));

describe("fetchCachedProductForLocale", () => {
  beforeEach(() => {
    getCrowdvineProductByHandle.mockReset();
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
  });

  it("returns null on miss without treating the miss as a cacheable product", async () => {
    getCrowdvineProductByHandle.mockResolvedValue(null);

    const { fetchCachedProductForLocale } = await import(
      "@/lib/crowdvine/pdp-product-cache"
    );

    await expect(
      fetchCachedProductForLocale("supernova-2024", "en", "pactwines.com"),
    ).resolves.toBeNull();
    expect(getCrowdvineProductByHandle).toHaveBeenCalledWith({
      handle: "supernova-2024",
      locale: "en",
      host: "pactwines.com",
    });
  });

  it("returns a found product through the cache wrapper", async () => {
    const product = { id: "wine-1", handle: "supernova-2024" };
    getCrowdvineProductByHandle.mockResolvedValue(product);

    const { fetchCachedProductForLocale } = await import(
      "@/lib/crowdvine/pdp-product-cache"
    );

    await expect(
      fetchCachedProductForLocale("supernova-2024", "en", "pactwines.com"),
    ).resolves.toEqual(product);
  });
});
