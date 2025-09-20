import { NavItem } from "./types";

export const TAGS = {
  mode: "mode",
  collections: "collections",
  products: "products",
  collectionProducts: "collection-products",
  cart: "cart",
};

export const CONTACT_LINKS: NavItem[] = [
  {
    label: "37°47'33.4\"N 122°24'18.6\"W",
    href: "https://maps.app.goo.gl/MnpbPDEHxoDydc9M9",
  },
  {
    label: "(269) 682-1402",
    href: "https://joyco.studio/showcase",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/joyco.studio/",
  },
];

export const HIDDEN_PRODUCT_TAG = "nextjs-frontend-hidden";
export const DEFAULT_OPTION = "Default Title";

export const isDevelopment = process.env.NODE_ENV === "development";

// Internal color mapping for common color names to hex values
export const COLOR_MAP: Record<string, string> = {
  // Wine-inspired colors
  red: "#CE0000",           // Classic wine red
  "rose": "#D4A5A5",        // Rosé wine color
  "light-red": "#A05252",   // Lighter wine red
  "dark-red": "#4A1A1F",    // Dark burgundy
  
  orange: "#FF8C00",        // Vibrant orange wine color
  "amber": "#D4A574",       // Golden amber
  
  purple: "#6B46C1",        // Deep purple wine
  "light-purple": "#8B7ED8", // Lighter purple
  "dark-purple": "#4C1D95", // Dark purple wine
  
  pink: "#E879F9",          // Pink wine/rosé
  "blush": "#F9A8D4",       // Blush wine
  
  // White wine colors
  white: "#FEF3C7",         // Pale golden white wine
  "golden": "#FCD34D",      // Golden white wine
  "straw": "#FDE68A",       // Straw-colored wine
  "champagne": "#FEF3C7",   // Champagne color
  
  // Earth tones for wine barrels/bottles
  brown: "#92400E",         // Oak barrel brown
  "dark-brown": "#451A03",  // Dark oak
  "light-brown": "#D97706", // Light oak
  "tan": "#D2B48C",         // Tan leather
  "beige": "#F5F5DC",       // Light beige
  
  // Natural colors
  green: "#365314",         // Forest green (vine leaves)
  "olive": "#6B7280",       // Olive green
  "sage": "#84CC16",        // Sage green
  "emerald": "#059669",     // Emerald green
  
  // Metallic colors for wine accessories
  gold: "#D97706",          // Wine gold
  silver: "#6B7280",        // Wine silver
  "copper": "#B45309",      // Copper wine accessories
  
  // Neutral colors
  black: "#1F2937",         // Dark charcoal
  gray: "#6B7280",          // Medium gray
  "dark-gray": "#374151",   // Dark gray
  "light-gray": "#D1D5DB",  // Light gray
  
  // Special wine blend colors
  "blend": "#8B5A2B",       // Wine blend color (mix of red and brown)
  "cuvée": "#A05252",       // Cuvée blend color
  
  // Traditional colors (keeping for compatibility)
  blue: "#3B82F6",
  yellow: "#EAB308",
  navy: "#1E3A8A",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  lime: "#84CC16",
  rose: "#F43F5E",
  fuchsia: "#D946EF",
  slate: "#64748B",
  neutral: "#737373",
  stone: "#78716C",
  zinc: "#71717A",
  
  // Additional variations
  "light-blue": "#38BDF8",
  "dark-blue": "#1E40AF",
  "light-green": "#4ADE80",
  "dark-green": "#232E23",
  "light-grey": "#D1D5DB",
  "dark-grey": "#374151",
  maroon: "#800000",
  aqua: "#00FFFF",
  coral: "#FF7F50",
  salmon: "#FA8072",
  khaki: "#F0E68C",
  sand: "#E7D3B7",
  plum: "#DDA0DD",
  crimson: "#DC143C",
  turquoise: "#40E0D0",
  lavender: "#E6E6FA",
  ivory: "#FFFFF0",
  mint: "#98FB98",
  peach: "#FFCBA4",
  pistachio: "#93C572",
  cream: "#EDD0AE",
  "army-green": "#4B5320",
  "navy-blue": "#000080",
  wood: "#8D6E63",
};
