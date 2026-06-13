import type { Product } from "@/lib/shopify/types";

export function filterProductsByGrapes(
  products: Product[],
  grapes: string[],
): Product[] {
  if (!grapes || grapes.length === 0) return products;

  const wanted = new Set(grapes.map((g) => g.toLowerCase()));
  return products.filter((product) => {
    const opt = product.options?.find((o) =>
      String(o?.name || "").toLowerCase().includes("grape"),
    );
    if (opt?.values?.length) {
      return opt.values.some((v) => {
        const name = typeof v === "string" ? v : v?.name;
        return name && wanted.has(String(name).toLowerCase());
      });
    }

    if (product.variants?.length) {
      return product.variants.some((variant) => {
        return (variant?.selectedOptions || []).some((so) => {
          const n = String(so?.name || "").toLowerCase();
          if (!n.includes("grape")) return false;
          const value = String(so?.value || "").toLowerCase();
          return wanted.has(value);
        });
      });
    }

    if (product.tags?.length) {
      return product.tags.some((t) =>
        wanted.has(String(t || "").toLowerCase()),
      );
    }

    return false;
  });
}
