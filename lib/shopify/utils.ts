import { thumbHashToDataURL } from "thumbhash";
import { ProductCollectionSortKey, ProductSortKey } from "./types";
import {
  displayFractionDigits,
  roundAmountForDisplay,
} from "@/lib/shopping-context/format";

// Format price utility - consistent across server and client
export const formatPrice = (
  price: string | number,
  currencyCode: string,
  intlLocale = "sv-SE",
): string => {
  const amount = typeof price === "string" ? parseFloat(price) : price;
  const decimals = displayFractionDigits(currencyCode);
  const roundedAmount = roundAmountForDisplay(amount, currencyCode, "ceil");

  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(roundedAmount);
};

/** Swedish VAT 25%. Convert price inkl moms → exkl moms. */
export function priceExclVat(amountInclVat: number): number {
  return amountInclVat / 1.25;
}

// Helper for returning the expected error state to actions instead of throwing.
export const handleFormActionError = (
  error: unknown,
  defaultMessage: string,
) => {
  return {
    errors: {
      formErrors: [(error as Error)?.message || defaultMessage],
    },
  };
};

// Thumbhash utilities
export function thumbhashToDataURL(thumbhash: string): string {
  try {
    // Convert base64 thumbhash to Uint8Array
    const thumbhashData = Uint8Array.from(atob(thumbhash), (c) =>
      c.charCodeAt(0),
    );

    // Convert thumbhash to data URL
    return thumbHashToDataURL(thumbhashData);
  } catch (error) {
    console.error("Error converting thumbhash to data URL:", error);
    return "";
  }
}

export function mapSortKeys(
  sortKey: string | undefined,
  type: "product",
): { sortKey: ProductSortKey; reverse: boolean };
export function mapSortKeys(
  sortKey: string | undefined,
  type: "collection",
): { sortKey: ProductCollectionSortKey; reverse: boolean };
export function mapSortKeys(
  sortKey: string | undefined,
  type: "product" | "collection" = "product",
): { sortKey: ProductSortKey | ProductCollectionSortKey; reverse: boolean } {
  switch (sortKey) {
    case "price-asc":
      return { sortKey: "PRICE", reverse: false };
    case "price-desc":
      return { sortKey: "PRICE", reverse: true };
    case "newest":
      if (type === "collection") {
        return { sortKey: "CREATED", reverse: false };
      }
      return { sortKey: "CREATED_AT", reverse: false };
    case "oldest":
      if (type === "collection") {
        return { sortKey: "CREATED", reverse: true };
      }
      return { sortKey: "CREATED_AT", reverse: true };
    default:
      return { sortKey: "RELEVANCE", reverse: false };
  }
}
