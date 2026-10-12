import {
  PRODUCER_BOX_BOTTLE_COUNT,
  PRODUCER_BOX_MAX_PER_WINE,
  type ProducerBoxDefinition,
  type ProducerBoxLine,
} from "@/lib/producer-boxes/config";

export interface ProducerBoxProducerRow {
  id: string;
  name: string;
}

export interface ProducerBoxWineRow {
  id: string;
  producer_id: string;
  wine_name: string;
  handle: string | null;
  color: string | null;
  vintage: string | null;
  base_price_cents: number | null;
  is_live: boolean | null;
  available_for_sale: boolean | null;
}

export type ProducerBoxSlotStatus =
  | "ok"
  | "missing"
  | "unpublished"
  | "not_for_sale"
  | "producer_mismatch"
  | "producer_missing";

export interface ResolvedProducerBoxWine {
  wineId: string;
  quantity: number;
  status: ProducerBoxSlotStatus;
  handle?: string;
  wineName?: string;
  color?: string | null;
  vintage?: string | null;
  priceCents?: number;
  producerId?: string;
}

export interface ResolvedProducerBox {
  definition: ProducerBoxDefinition;
  producerId?: string;
  producerName?: string;
  producerFound: boolean;
  slots: ResolvedProducerBoxWine[];
  /** All lines are published, for sale, from one producer, and total six bottles. */
  purchasable: boolean;
  totalCents: number | null;
}

function priceCentsOf(wine: ProducerBoxWineRow): number | undefined {
  return wine.base_price_cents != null && Number.isFinite(wine.base_price_cents)
    ? wine.base_price_cents
    : undefined;
}

function slotFromWine(
  line: ProducerBoxLine,
  wine: ProducerBoxWineRow,
  status: Exclude<ProducerBoxSlotStatus, "missing" | "producer_missing">,
): ResolvedProducerBoxWine {
  return {
    wineId: wine.id,
    quantity: line.quantity,
    status,
    handle: wine.handle ?? undefined,
    wineName: wine.wine_name,
    color: wine.color,
    vintage: wine.vintage,
    priceCents: priceCentsOf(wine),
    producerId: wine.producer_id,
  };
}

export function linesAreSixBottles(lines: readonly ProducerBoxLine[]): boolean {
  if (lines.length === 0) return false;
  if (lines.some((line) => !Number.isInteger(line.quantity))) return false;
  if (
    lines.some(
      (line) => line.quantity < 1 || line.quantity > PRODUCER_BOX_MAX_PER_WINE,
    )
  ) {
    return false;
  }
  const ids = new Set(lines.map((line) => line.wineId));
  if (ids.size !== lines.length) return false;
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  return total === PRODUCER_BOX_BOTTLE_COUNT;
}

export function resolveProducerBox(
  definition: ProducerBoxDefinition,
  producers: readonly ProducerBoxProducerRow[],
  wines: readonly ProducerBoxWineRow[],
): ResolvedProducerBox {
  const quantityValid = linesAreSixBottles(definition.lines);
  const byId = new Map(wines.map((wine) => [wine.id, wine]));
  const found = definition.lines
    .map((line) => byId.get(line.wineId))
    .filter((wine): wine is ProducerBoxWineRow => Boolean(wine));
  const producerIds = new Set(found.map((wine) => wine.producer_id));
  const sharedProducerId = producerIds.size === 1 ? [...producerIds][0] : undefined;

  const slots = definition.lines.map((line) => {
    const wine = byId.get(line.wineId);
    if (!wine) {
      return {
        wineId: line.wineId,
        quantity: line.quantity,
        status: "missing" as const,
      };
    }
    if (sharedProducerId && wine.producer_id !== sharedProducerId) {
      return slotFromWine(line, wine, "producer_mismatch");
    }
    if (producerIds.size > 1) {
      return slotFromWine(line, wine, "producer_mismatch");
    }
    if (wine.is_live !== true) {
      return slotFromWine(line, wine, "unpublished");
    }
    if (wine.available_for_sale === false) {
      return slotFromWine(line, wine, "not_for_sale");
    }
    return slotFromWine(line, wine, "ok");
  });

  const producer = sharedProducerId
    ? producers.find((row) => row.id === sharedProducerId)
    : undefined;
  const priced = slots.every(
    (slot) => slot.status !== "missing" && slot.priceCents != null,
  );
  const totalCents =
    priced && quantityValid
      ? slots.reduce((sum, slot) => sum + (slot.priceCents ?? 0) * slot.quantity, 0)
      : null;
  const purchasable =
    quantityValid &&
    producerIds.size === 1 &&
    slots.every((slot) => slot.status === "ok" && slot.wineId);

  return {
    definition,
    producerId: sharedProducerId,
    producerName: producer?.name ?? definition.producerName,
    producerFound: Boolean(sharedProducerId),
    slots,
    purchasable,
    totalCents,
  };
}

export function batchAddItems(
  box: ResolvedProducerBox,
): { variantId: string; quantity: number }[] | null {
  if (!box.purchasable) return null;
  const items = box.slots.map((slot) => ({
    variantId: slot.wineId,
    quantity: slot.quantity,
  }));
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (
    total !== PRODUCER_BOX_BOTTLE_COUNT ||
    items.some(
      (item) =>
        !item.variantId ||
        item.quantity < 1 ||
        item.quantity > PRODUCER_BOX_MAX_PER_WINE,
    )
  ) {
    return null;
  }
  return items;
}
