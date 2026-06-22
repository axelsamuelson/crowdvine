import {
  getPalletLineCost,
  type WineCostFields,
} from "@/lib/b2b-wine-cost";

import type { PalletCommercialLine } from "@/lib/b2b-pallet-commercial";

export type SortDirection = "asc" | "desc";

export type PalletWineSortKey =
  | "wine"
  | "producer"
  | "color"
  | "quantity"
  | "purchase"
  | "alcohol_tax"
  | "unit_total"
  | "line_total"
  | "customer_price"
  | "line_customer_value";

export type PalletProducerSortKey =
  | "producer"
  | "wine_count"
  | "bottles"
  | "distance"
  | "drive_time";

type PalletItemLike = {
  wine_id: string;
  quantity: number;
  cost_cents_override: number | null;
  wine?: WineCostFields & {
    wine_name?: string;
    vintage?: string;
    color?: string | null;
    costCentsExVat?: number;
    producers?: { name?: string | null } | null;
  };
};

export function compareStrings(
  a: string,
  b: string,
  direction: SortDirection,
): number {
  const cmp = a.localeCompare(b, "sv", { sensitivity: "base" });
  return direction === "asc" ? cmp : -cmp;
}

export function compareNumbers(
  a: number,
  b: number,
  direction: SortDirection,
): number {
  const cmp = a - b;
  return direction === "asc" ? cmp : -cmp;
}

export function toggleSortDirection(
  currentKey: string,
  nextKey: string,
  currentDir: SortDirection,
): SortDirection {
  if (currentKey === nextKey) {
    return currentDir === "asc" ? "desc" : "asc";
  }
  return "asc";
}

export function sortPalletItems<T extends PalletItemLike>(
  items: T[],
  sortKey: PalletWineSortKey,
  direction: SortDirection,
  fxRates?: Record<string, number>,
  commercialByWineId?: Map<string, PalletCommercialLine>,
): T[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const wineA = a.wine;
    const wineB = b.wine;
    const lineA = getPalletLineCost(
      a.quantity,
      a.cost_cents_override,
      wineA,
      fxRates,
    );
    const lineB = getPalletLineCost(
      b.quantity,
      b.cost_cents_override,
      wineB,
      fxRates,
    );

    switch (sortKey) {
      case "wine": {
        const labelA = wineA
          ? `${wineA.wine_name ?? ""} ${wineA.vintage ?? ""}`.trim()
          : a.wine_id;
        const labelB = wineB
          ? `${wineB.wine_name ?? ""} ${wineB.vintage ?? ""}`.trim()
          : b.wine_id;
        return compareStrings(labelA, labelB, direction);
      }
      case "producer":
        return compareStrings(
          wineA?.producers?.name?.trim() || "Okänd producent",
          wineB?.producers?.name?.trim() || "Okänd producent",
          direction,
        );
      case "color":
        return compareStrings(
          wineA?.color?.trim() || "Okänd färg",
          wineB?.color?.trim() || "Okänd färg",
          direction,
        );
      case "quantity":
        return compareNumbers(a.quantity, b.quantity, direction);
      case "purchase":
        return compareNumbers(
          lineA.purchaseCentsPerBottle,
          lineB.purchaseCentsPerBottle,
          direction,
        );
      case "alcohol_tax":
        return compareNumbers(
          lineA.alcoholTaxCentsPerBottle,
          lineB.alcoholTaxCentsPerBottle,
          direction,
        );
      case "unit_total":
        return compareNumbers(
          lineA.unitTotalCentsPerBottle,
          lineB.unitTotalCentsPerBottle,
          direction,
        );
      case "line_total":
        return compareNumbers(lineA.lineTotalCents, lineB.lineTotalCents, direction);
      case "customer_price": {
        const valA =
          commercialByWineId?.get(a.wine_id)?.unitCustomerDisplayCents ??
          Number.NEGATIVE_INFINITY;
        const valB =
          commercialByWineId?.get(b.wine_id)?.unitCustomerDisplayCents ??
          Number.NEGATIVE_INFINITY;
        return compareNumbers(valA, valB, direction);
      }
      case "line_customer_value": {
        const valA =
          commercialByWineId?.get(a.wine_id)?.lineCustomerValueCents ??
          Number.NEGATIVE_INFINITY;
        const valB =
          commercialByWineId?.get(b.wine_id)?.lineCustomerValueCents ??
          Number.NEGATIVE_INFINITY;
        return compareNumbers(valA, valB, direction);
      }
      default:
        return 0;
    }
  });
  return sorted;
}

export type ProducerSummaryRow = {
  name: string;
  producerId: string | null;
  bottles: number;
  wineCount: number;
  wines: Array<{
    wine_id: string;
    wine: PalletItemLike["wine"];
    quantity: number;
  }>;
};

export function sortProducerSummaryRows(
  rows: ProducerSummaryRow[],
  sortKey: PalletProducerSortKey,
  direction: SortDirection,
  opts?: {
    drivingRoutes?: Record<string, { distanceMeters?: number; durationSeconds?: number }>;
    pickupProducerId?: string | null;
  },
): ProducerSummaryRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const keyA = a.producerId ?? a.name;
    const keyB = b.producerId ?? b.name;
    const isPickupA = Boolean(opts?.pickupProducerId && a.producerId === opts.pickupProducerId);
    const isPickupB = Boolean(opts?.pickupProducerId && b.producerId === opts.pickupProducerId);

    switch (sortKey) {
      case "producer":
        return compareStrings(a.name, b.name, direction);
      case "wine_count":
        return compareNumbers(a.wineCount, b.wineCount, direction);
      case "bottles":
        return compareNumbers(a.bottles, b.bottles, direction);
      case "distance": {
        if (isPickupA && !isPickupB) return direction === "asc" ? -1 : 1;
        if (!isPickupA && isPickupB) return direction === "asc" ? 1 : -1;
        const valA = opts?.drivingRoutes?.[keyA]?.distanceMeters ?? Number.POSITIVE_INFINITY;
        const valB = opts?.drivingRoutes?.[keyB]?.distanceMeters ?? Number.POSITIVE_INFINITY;
        return compareNumbers(valA, valB, direction);
      }
      case "drive_time": {
        if (isPickupA && !isPickupB) return direction === "asc" ? -1 : 1;
        if (!isPickupA && isPickupB) return direction === "asc" ? 1 : -1;
        const secA = opts?.drivingRoutes?.[keyA]?.durationSeconds ?? Number.POSITIVE_INFINITY;
        const secB = opts?.drivingRoutes?.[keyB]?.durationSeconds ?? Number.POSITIVE_INFINITY;
        return compareNumbers(secA, secB, direction);
      }
      default:
        return 0;
    }
  });
  return sorted;
}
