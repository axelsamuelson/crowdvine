import { VariantOptionSelector } from "@/components/products/variant-selector";
import { Product } from "@/lib/shopify/types";

function isDisplayOnlyPdpOption(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower === "color" ||
    lower === "grape variety" ||
    lower === "grape varieties"
  );
}

export function VariantSelectorSlots({ product }: { product: Product }) {
  const options = product.options.filter(
    (option) => !isDisplayOnlyPdpOption(option.name),
  );

  const hasNoOptionsOrJustOneOption =
    !options.length ||
    (options.length === 1 && options[0]?.values.length === 1);

  if (hasNoOptionsOrJustOneOption) {
    return null;
  }

  return (
    <>
      {options.map((option) => (
        <VariantOptionSelector
          key={option.id}
          option={option}
          product={product}
          variant="card"
        />
      ))}
    </>
  );
}
