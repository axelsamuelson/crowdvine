import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductData } from "@/lib/crowdvine/products-data";

vi.mock("next/navigation", () => ({
  usePathname: () => "/guider/vad-ar-pet-nat",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: () => null,
  })),
}));

vi.mock("next/image", () => ({
  default: (props: { alt?: string; src?: string }) =>
    createElement("img", { alt: props.alt ?? "", src: props.src }),
}));

vi.mock("@/lib/crowdvine/products-data", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/crowdvine/products-data")>();
  return {
    ...actual,
    fetchProductsData: vi.fn(),
  };
});

import VadArPetNatGuidePage from "@/app/guider/vad-ar-pet-nat/page";
import { fetchProductsData } from "@/lib/crowdvine/products-data";
import { GuideTaggedWineBlock } from "@/lib/guides/guide-tagged-wine-block";

function wine(index: number): ProductData {
  return {
    id: `wine-${index}`,
    title: `Pet Nat ${index}`,
    description: "",
    handle: `pet-nat-${index}`,
    productType: "wine",
    categoryId: "",
    producerId: "producer-1",
    producerName: "Domaine Test",
    options: [],
    variants: [],
    priceRange: {
      minVariantPrice: { amount: "190", currencyCode: "SEK" },
      maxVariantPrice: { amount: "190", currencyCode: "SEK" },
    },
    priceBreakdown: { basePriceCents: 19000 },
    featuredImage: {
      id: `img-${index}`,
      url: "/placeholder.png",
      altText: `Pet Nat ${index}`,
      width: 600,
      height: 600,
    },
    images: [],
    seo: { title: `Pet Nat ${index}`, description: "" },
    tags: ["pet_nat"],
    availableForSale: true,
    currencyCode: "SEK",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("pet nat guide product block", () => {
  beforeEach(() => {
    vi.mocked(fetchProductsData).mockReset();
  });

  it("renders up to six live cards in catalog order, then hides the block when empty", async () => {
    const products = Array.from({ length: 8 }, (_, index) => wine(index + 1));
    vi.mocked(fetchProductsData).mockResolvedValue(products);

    const page = await VadArPetNatGuidePage();
    const html = renderToStaticMarkup(page);

    expect(vi.mocked(fetchProductsData)).toHaveBeenCalledWith(
      expect.objectContaining({
        filterTags: ["pet_nat"],
        locale: "sv",
      }),
    );
    expect(html).toContain("Pet nat att köpa hos PACT");
    expect(html).toContain(
      "Pet nat som vi köper direkt från producenterna, med leverans i hela Sverige på delad pall eller direkt hem.",
    );
    expect(html).toContain('href="/vin/pet-nat"');
    expect(html).toContain(">Se alla pet nat →<");
    expect(html).toContain(">Pet Nat 1<");
    expect(html).toContain("Domaine Test");
    expect(html).toContain('src="/placeholder.png"');
    expect(html).toContain("190");
    expect(html.indexOf(">Pet Nat 1<")).toBeLessThan(html.indexOf(">Pet Nat 6<"));
    expect(html).not.toContain(">Pet Nat 7<");
    expect(html).not.toContain("Naturviner hos PACT");

    vi.mocked(fetchProductsData).mockResolvedValue([]);
    const empty = await GuideTaggedWineBlock({
      tag: "pet_nat",
      heading: "Pet nat att köpa hos PACT",
      intro: "Pet nat som vi köper direkt från producenterna.",
      link: { href: "/vin/pet-nat", label: "Se alla pet nat →" },
      locale: "sv",
    });
    expect(empty).toBeNull();
  });
});
