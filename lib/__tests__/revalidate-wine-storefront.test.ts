import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const revalidateTag = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
}));

describe("revalidateWineStorefrontCaches", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    revalidateTag.mockClear();
  });

  it("busts PDP tags/paths for wine handles and producer public paths", async () => {
    const { revalidateWineStorefrontCaches } = await import(
      "@/lib/crowdvine/revalidate-wine-storefront"
    );

    revalidateWineStorefrontCaches(["supernova-2024"], {
      producerNames: ["Domaine Danjou-Banessy"],
      wineRegions: ["Loire", "jura"],
    });

    expect(revalidateTag).toHaveBeenCalledWith("shop-products", "max");
    expect(revalidateTag).toHaveBeenCalledWith("pdp-product", "max");
    expect(revalidateTag).toHaveBeenCalledWith(
      "pdp-product:supernova-2024",
      "max",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/product/supernova-2024");
    expect(revalidatePath).toHaveBeenCalledWith("/produkt/supernova-2024");
    expect(revalidatePath).toHaveBeenCalledWith(
      "/producenter/domaine-danjou-banessy",
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      "/producers/domaine-danjou-banessy",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/vin/domaine-danjou-banessy");
    expect(revalidatePath).toHaveBeenCalledWith("/wine/domaine-danjou-banessy");
    expect(revalidatePath).toHaveBeenCalledWith("/vin/naturvin-loire");
    expect(revalidatePath).toHaveBeenCalledWith("/wine/loire-natural-wine");
    expect(revalidatePath).toHaveBeenCalledWith("/vin/naturvin-jura");
    expect(revalidatePath).toHaveBeenCalledWith("/wine/jura-natural-wine");
  });
});
