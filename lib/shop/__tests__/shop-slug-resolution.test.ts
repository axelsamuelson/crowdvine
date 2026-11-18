import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("@/lib/shopify", () => ({
  getCollection: vi.fn(),
}));

vi.mock("@/lib/wine-grape-categories", () => ({
  resolveGrapeCategoryBySlug: vi.fn(),
}));

import { getCollection } from "@/lib/shopify";
import { resolveGrapeCategoryBySlug } from "@/lib/wine-grape-categories";
import {
  notFoundUnlessShopSlug,
  resolveShopSlug,
  shopPathSlug,
} from "@/lib/shop/shop-slug-resolution";

const getCollectionMock = vi.mocked(getCollection);
const resolveCategoryMock = vi.mocked(resolveGrapeCategoryBySlug);

describe("shop slug resolution", () => {
  beforeEach(() => {
    getCollectionMock.mockReset();
    resolveCategoryMock.mockReset();
    getCollectionMock.mockResolvedValue(null);
    resolveCategoryMock.mockResolvedValue(undefined);
  });

  it("reads only a single /vin or /wine segment", () => {
    expect(shopPathSlug("/vin/pet-nat", "sv")).toBe("pet-nat");
    expect(shopPathSlug("/wine/pet-nat", "en")).toBe("pet-nat");
    expect(shopPathSlug("/vin", "sv")).toBeNull();
    expect(shopPathSlug("/vin/group/abc", "sv")).toBeNull();
    expect(shopPathSlug("/wine/hors-saison", "sv")).toBeNull();
  });

  it("keeps producer-box, category, and producer collection slugs", async () => {
    await expect(resolveShopSlug("naturvin-lada", "sv")).resolves.toEqual({
      kind: "producer-boxes",
    });
    expect(resolveCategoryMock).not.toHaveBeenCalled();

    resolveCategoryMock.mockResolvedValueOnce({
      slug: "rott-naturvin",
    } as never);
    await expect(resolveShopSlug("rott-naturvin", "sv")).resolves.toMatchObject({
      kind: "category",
    });
    expect(getCollectionMock).not.toHaveBeenCalled();

    getCollectionMock.mockResolvedValueOnce({
      handle: "chateau-del-ranq",
      title: "Château del Ranq",
    } as never);
    await expect(
      resolveShopSlug("chateau-del-ranq", "sv"),
    ).resolves.toMatchObject({ kind: "collection" });
  });

  it("treats an unmatched slug as missing and calls notFound()", async () => {
    await expect(resolveShopSlug("not-a-category", "sv")).resolves.toEqual({
      kind: "missing",
    });
    await expect(resolveShopSlug("not-a-category", "en")).resolves.toEqual({
      kind: "missing",
    });
    await expect(notFoundUnlessShopSlug("random-test-slug-123", "sv")).rejects.toThrow(
      "notFound",
    );
  });
});
