import type { ProducerBoxDefinition } from "@/lib/producer-boxes/config";

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
  | "ambiguous"
  | "producer_missing";

export interface ResolvedProducerBoxWine {
  configuredName: string;
  status: ProducerBoxSlotStatus;
  wineId?: string;
  handle?: string;
  wineName?: string;
  color?: string | null;
  vintage?: string | null;
  priceCents?: number;
}

export interface ResolvedProducerBox {
  definition: ProducerBoxDefinition;
  producerId?: string;
  producerName?: string;
  producerFound: boolean;
  slots: ResolvedProducerBoxWine[];
  /** All six wines are published and available for sale. */
  purchasable: boolean;
  totalCents: number | null;
}

/** Accent- and apostrophe-insensitive exact name. Does not match a longer title. */
export function normalizeCatalogName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’‘´`]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slotFromWine(
  configuredName: string,
  wine: ProducerBoxWineRow,
  status: Exclude<ProducerBoxSlotStatus, "missing" | "ambiguous" | "producer_missing">,
): ResolvedProducerBoxWine {
  const price =
    wine.base_price_cents != null && Number.isFinite(wine.base_price_cents)
      ? wine.base_price_cents
      : undefined;
  return {
    configuredName,
    status,
    wineId: wine.id,
    handle: wine.handle ?? undefined,
    wineName: wine.wine_name,
    color: wine.color,
    vintage: wine.vintage,
    priceCents: price,
  };
}

export function resolveProducerBox(
  definition: ProducerBoxDefinition,
  producers: readonly ProducerBoxProducerRow[],
  wines: readonly ProducerBoxWineRow[],
): ResolvedProducerBox {
  const producerKey = normalizeCatalogName(definition.producerName);
  const producerHits = producers.filter(
    (producer) => normalizeCatalogName(producer.name) === producerKey,
  );

  if (producerHits.length !== 1) {
    return {
      definition,
      producerFound: false,
      slots: definition.wineNames.map((configuredName) => ({
        configuredName,
        status: "producer_missing" as const,
      })),
      purchasable: false,
      totalCents: null,
    };
  }

  const producer = producerHits[0]!;
  const producerWines = wines.filter((wine) => wine.producer_id === producer.id);

  const slots = definition.wineNames.map((configuredName) => {
    const key = normalizeCatalogName(configuredName);
    const hits = producerWines.filter(
      (wine) => normalizeCatalogName(wine.wine_name) === key,
    );
    if (hits.length === 0) {
      return { configuredName, status: "missing" as const };
    }
    if (hits.length > 1) {
      return { configuredName, status: "ambiguous" as const };
    }
    const wine = hits[0]!;
    if (wine.is_live !== true) {
      return slotFromWine(configuredName, wine, "unpublished");
    }
    if (wine.available_for_sale === false) {
      return slotFromWine(configuredName, wine, "not_for_sale");
    }
    return slotFromWine(configuredName, wine, "ok");
  });

  const priced = slots.every(
    (slot) => slot.status !== "missing" && slot.status !== "ambiguous" && slot.priceCents != null,
  );
  const totalCents = priced
    ? slots.reduce((sum, slot) => sum + (slot.priceCents ?? 0), 0)
    : null;

  return {
    definition,
    producerId: producer.id,
    producerName: producer.name,
    producerFound: true,
    slots,
    purchasable: slots.every((slot) => slot.status === "ok" && slot.wineId),
    totalCents,
  };
}

export function batchAddItems(
  box: ResolvedProducerBox,
): { variantId: string; quantity: number }[] | null {
  if (!box.purchasable) return null;
  const items = box.slots.map((slot) => ({
    variantId: slot.wineId ?? "",
    quantity: 1,
  }));
  if (items.length !== 6 || items.some((item) => !item.variantId)) return null;
  return items;
}
