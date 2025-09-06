import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { COLOR_MAP } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: string | number, currencyCode: string) {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  // Round up to nearest whole number
  const roundedAmount = Math.ceil(numAmount);

  // Use Swedish locale for consistent formatting with 0 decimal places
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount);
}

export function createUrl(pathname: string, params: URLSearchParams | string) {
  const paramsString = params?.toString();
  const queryString = `${paramsString.length ? "?" : ""}${paramsString}`;

  return `${pathname}${queryString}`;
}

export function getColorHex(
  colorName: string | undefined | null,
): string | [string, string] {
  if (!colorName) {
    return "#000000"; // Default black color
  }

  const lowerColorName = colorName.toLowerCase();

  // Check for exact match first
  if (COLOR_MAP[lowerColorName]) {
    return COLOR_MAP[lowerColorName];
  }

  // Check for partial matches (for cases where color name might have extra text)
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (lowerColorName.includes(key) || key.includes(lowerColorName)) {
      return value;
    }
  }

  // Return a default color if no match found
  return "#666666";
}

export const getLabelPosition = (
  index: number,
): "top-left" | "top-right" | "bottom-left" | "bottom-right" => {
  const positions = [
    "top-left",
    "bottom-right",
    "top-right",
    "bottom-left",
  ] as const;
  return positions[index % positions.length];
};
