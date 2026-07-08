import type { Product } from "@/lib/shopify/types";

function normalizeColorForCompare(s: string | undefined | null): string {
  if (!s || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/\s*[\/&]\s*/g, " & ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

export function filterProductsByColors(
  products: Product[],
  colors: string[],
): Product[] {
  if (!colors || colors.length === 0) {
    return products;
  }

  return products.filter((product) => {
    const matchColor = (variantOrOptionColor: string | undefined | null) =>
      colors.some(
        (selectedColor) =>
          normalizeColorForCompare(selectedColor) ===
          normalizeColorForCompare(variantOrOptionColor),
      );

    const hasMatchingColor = product.variants?.some((variant) => {
      if (!variant.selectedOptions) return false;
      return variant.selectedOptions.some((option) => {
        const isColorOption =
          option.name?.toLowerCase().includes("color") ||
          option.name?.toLowerCase().includes("colour");
        if (!isColorOption) return false;
        const variantColor = option.value ?? option.name;
        return matchColor(variantColor);
      });
    });

    if (!hasMatchingColor && product.options) {
      const colorOption = product.options.find(
        (opt) =>
          opt.name?.toLowerCase().includes("color") ||
          opt.name?.toLowerCase().includes("colour"),
      );
      if (colorOption?.values?.length) {
        return colorOption.values.some((value) => {
          const colorValue =
            typeof value === "string" ? value : value.name ?? value.id ?? "";
          return matchColor(colorValue);
        });
      }
    }

    return !!hasMatchingColor;
  });
}
