"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  CartProduct,
  Product,
  ProductOption,
  ProductVariant,
  SelectedOptions,
} from "@/lib/shopify/types";
import { startTransition, useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getColorHex } from "@/lib/utils";

type Combination = {
  id: string;
  availableForSale: boolean;
  [key: string]: string | boolean;
};

const variantOptionSelectorVariants = cva("flex items-center gap-4", {
  variants: {
    variant: {
      card: "rounded-lg bg-popover py-2.5 px-3 justify-between",
      condensed: "justify-start",
    },
  },
  defaultVariants: {
    variant: "card",
  },
});

interface VariantOptionSelectorProps
  extends VariantProps<typeof variantOptionSelectorVariants> {
  option: ProductOption;
  product: Product;
}

export function VariantOptionSelector({
  option,
  variant,
  product,
}: VariantOptionSelectorProps) {
  const { variants, options } = product;
  const searchParams = useSearchParams();
  const pathname = useParams<{ handle?: string }>();
  const optionNameLowerCase = option.name.toLowerCase();

  const [selectedValue, setSelectedValue] = useQueryState(
    optionNameLowerCase,
    parseAsString.withDefault(""),
  );
  const [activeProductId, setActiveProductId] = useQueryState(
    "pid",
    parseAsString.withDefault(""),
  );

  // Get all current selected options from URL
  const getCurrentSelectedOptions = () => {
    const state: Record<string, string> = {};

    options.forEach((opt) => {
      const key = opt.name.toLowerCase();
      const value = searchParams.get(key);
      if (value) {
        state[key] = value;
      }
    });

    return state;
  };

  const combinations: Combination[] = Array.isArray(variants)
    ? variants.map((variant) => ({
        id: variant.id,
        availableForSale: variant.availableForSale,
        ...variant.selectedOptions.reduce(
          (accumulator, option) => ({
            ...accumulator,
            [option.name.toLowerCase()]: option.value,
          }),
          {},
        ),
      }))
    : [];

  const isProductPage = pathname.handle === product.id;
  const isTargetingProduct = isProductPage || activeProductId === product.id;

  return (
    <dl className={variantOptionSelectorVariants({ variant })}>
      <dt className="text-base font-semibold leading-7">{option.name}</dt>
      <dd className="flex flex-wrap gap-2">
        {option.values.map((value, index) => {
          // Create a unique key using index and value name/id
          const key = `${option.id}-${value.id || value.name}-${index}`;

          // Check if this is a color or grape variety option (display only)
          const isColorOption = optionNameLowerCase === "color";
          const isGrapeVarietyOption =
            optionNameLowerCase === "grape variety" ||
            optionNameLowerCase === "grape varieties";
          const isAlcoholOption = optionNameLowerCase === "alcohol";
          const isDisplayOnlyOption =
            isColorOption || isGrapeVarietyOption || isAlcoholOption;

          // If this is a color option, show color display only
          if (isColorOption) {
            const color = getColorHex(value.name);
            const name = value.name ? value.name.split("/") : ["Unknown"];

            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full border border-gray-300"
                  style={{
                    backgroundColor: Array.isArray(color) ? color[0] : color,
                  }}
                  title={value.name}
                />
                <span className="text-sm text-gray-700">{value.name}</span>
              </div>
            );
          }

          // If this is a grape variety option, show as text only
          if (isGrapeVarietyOption) {
            return (
              <span key={key} className="text-sm text-gray-700">
                {value.name}
              </span>
            );
          }

          // Alcohol option display
          if (isAlcoholOption) {
            const displayValue =
              typeof value.name === "string" && value.name.length > 0
                ? value.name.endsWith("%")
                  ? value.name
                  : `${value.name}%`
                : "";
            return displayValue ? (
              <span key={key} className="text-sm font-semibold text-gray-800">
                {displayValue}
              </span>
            ) : null;
          }

          // For other options, keep the interactive button behavior
          // Get current state for availability check
          const currentState = getCurrentSelectedOptions();
          const optionParams = {
            ...currentState,
            [optionNameLowerCase]: value.id,
          };

          // Filter out invalid options and check if the option combination is available for sale.
          const filtered = Object.entries(optionParams).filter(([key, value]) =>
            options.find(
              (option) =>
                option.name.toLowerCase() === key &&
                option.values.some((val) => val.name === value),
            ),
          );
          const isAvailableForSale = combinations.find((combination) =>
            filtered.every(
              ([key, value]) =>
                combination[key] === value && combination.availableForSale,
            ),
          );

          // The option is active if it's the selected value
          const isActive = isTargetingProduct && selectedValue === value.name;

          return (
            <Button
              key={key}
              onClick={() => {
                startTransition(() => {
                  setSelectedValue(value.name);

                  if (!isProductPage) {
                    setActiveProductId(product.id);
                  }
                });
              }}
              variant={isActive ? "default" : "outline"}
              size="sm"
              disabled={!isAvailableForSale}
              title={`${option.name} ${value.name}${!isAvailableForSale ? " (Out of Stock)" : ""}`}
              className="min-w-[40px]"
            >
              {value.name}
            </Button>
          );
        })}
      </dd>
    </dl>
  );
}

export const useSelectedVariant = (product: Product) => {
  const { variants, options } = product;
  const searchParams = useSearchParams();

  // Get all current selected options from URL
  const getCurrentSelectedOptions = () => {
    const state: Record<string, string> = {};

    options.forEach((option) => {
      const key = option.name.toLowerCase();
      const value = searchParams.get(key);
      if (value) {
        state[key] = value;
      }
    });

    return state;
  };

  const selectedOptions = getCurrentSelectedOptions();

  // Find the variant that matches all selected options
  const selectedVariant = Array.isArray(variants)
    ? variants.find((variant: ProductVariant) =>
        variant.selectedOptions.every(
          (option) =>
            option.value === selectedOptions[option.name.toLowerCase()],
        ),
      )
    : undefined;

  return selectedVariant;
};

export const useProductImages = (
  product: Product | CartProduct,
  selectedOptions?: SelectedOptions,
) => {
  const images = useMemo(() => {
    return Array.isArray(product.images) ? product.images : [];
  }, [product.images]);

  const optionsObject = useMemo(() => {
    return selectedOptions?.reduce(
      (acc, option) => {
        acc[option.name.toLowerCase()] = option.value.toLowerCase();
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [selectedOptions]);

  // Try to match images by alt text with selected variant values
  // This enables Shopify products to show different images when variants are selected
  // by matching the image alt text with variant names (e.g., "Red Shirt" shows when Red is selected)
  const variantImagesByAlt = useMemo(() => {
    if (!optionsObject || Object.keys(optionsObject).length === 0) return [];

    const selectedValues = Object.values(optionsObject);

    return images.filter((image) => {
      if (!image.altText) return false;

      const altTextLower = image.altText.toLowerCase();

      // Check if any selected variant value is mentioned in the alt text
      return selectedValues.some((value) =>
        altTextLower.includes(value.toLowerCase()),
      );
    });
  }, [optionsObject, images]);

  // Original logic for images with selectedOptions metadata
  const variantImages = useMemo(() => {
    if (!optionsObject) return [];

    return images.filter((image) => {
      return Object.entries(optionsObject || {}).every(([key, value]) =>
        image.selectedOptions?.some(
          (option) => option.name === key && option.value === value,
        ),
      );
    });
  }, [optionsObject, images]);

  const defaultImages = images.filter((image) => !image.selectedOptions);
  const featuredImage = product.featuredImage;

  // Prioritize images with selectedOptions metadata first
  if (variantImages.length > 0) {
    return variantImages;
  }

  // Then try images matched by alt text (for Shopify products with 2+ variants)
  if (variantImagesByAlt.length > 0) {
    return variantImagesByAlt;
  }

  // Fall back to default images
  if (defaultImages.length > 0) {
    return defaultImages;
  }

  // Final fallback to featured image
  if (featuredImage) {
    return [featuredImage];
  }

  // Ultimate fallback - return first image or empty array
  return images.length > 0 ? [images[0]] : [];
};
