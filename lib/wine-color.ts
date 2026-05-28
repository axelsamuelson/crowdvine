export function wineColorDotClass(color: string | null | undefined): string {
  const c = (color ?? "").toLowerCase();
  if (c.includes("red")) return "bg-red-600";
  if (c.includes("white")) return "bg-amber-100 ring-1 ring-amber-300";
  if (c.includes("sparkling")) return "bg-blue-500";
  if (c.includes("rose") || c.includes("rosé")) return "bg-pink-400";
  if (c.includes("orange")) return "bg-orange-500";
  return "bg-zinc-400";
}

export type PalletColorCount = {
  color: string;
  bottles: number;
};

const COLOR_SORT_KEYS = ["red", "white", "rosé", "rose", "orange", "sparkling"];

function colorSortIndex(color: string): number {
  const c = color.toLowerCase();
  const idx = COLOR_SORT_KEYS.findIndex((k) => c.includes(k));
  return idx >= 0 ? idx : 99;
}

/** Sum bottle counts per wine color on a pallet. */
export function computePalletColorCounts(
  lines: Array<{
    quantity: number;
    wine?: { color?: string | null } | null;
  }>,
): PalletColorCount[] {
  const map = new Map<string, number>();
  for (const line of lines) {
    const color = line.wine?.color?.trim() || "Okänd färg";
    map.set(color, (map.get(color) ?? 0) + Math.max(0, line.quantity || 0));
  }
  return Array.from(map.entries())
    .map(([color, bottles]) => ({ color, bottles }))
    .sort(
      (a, b) =>
        colorSortIndex(a.color) - colorSortIndex(b.color) ||
        b.bottles - a.bottles ||
        a.color.localeCompare(b.color, "sv"),
    );
}
