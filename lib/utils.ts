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

/** Map single word color to hex; used for blend parsing */
function getSingleColorHex(word: string): string {
  const w = word.trim().toLowerCase();
  if (COLOR_MAP[w]) return COLOR_MAP[w];
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (w === key || w.includes(key) || key.includes(w)) return value;
  }
  return "#666666";
}

export function getColorHex(
  colorName: string | undefined | null,
): string | [string, string] {
  if (!colorName) {
    return "#000000"; // Default black color
  }

  const lowerColorName = colorName.trim().toLowerCase();

  // Check for exact match first
  if (COLOR_MAP[lowerColorName]) {
    return COLOR_MAP[lowerColorName];
  }

  // Blend colors: "Red & White", "Red/White", "Red / White"
  const blendParts = lowerColorName.split(/\s*[\/&]\s*/).map((s) => s.trim()).filter(Boolean);
  if (blendParts.length >= 2) {
    const hex1 = getSingleColorHex(blendParts[0]);
    const hex2 = getSingleColorHex(blendParts[1]);
    return [hex1, hex2];
  }

  // Single color: partial match
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (lowerColorName.includes(key) || key.includes(lowerColorName)) {
      return value;
    }
  }

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
