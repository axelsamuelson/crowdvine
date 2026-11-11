/**
 * Admin pick list for a direct_box order: boxes per packing source,
 * wine lines, pickup address, and pickup deadlines.
 */

import {
  PACK_BOTTLES_PER_SOURCE,
  resolvePackingSource,
  type PackingSource,
} from "@/lib/cart/packing-source";
import { targetBoxCountFromBottles } from "@/lib/cart/packing-source-display";
import {
  ADDRESS_MISSING_LABEL,
  formatProducerPickupAddress,
  wholesalerPickupAddressFallback,
} from "@/lib/admin/direct-box-pickup-addresses";
import {
  directBoxPickupDeadlines,
  formatIsoDateUTC,
} from "@/lib/admin/direct-box-business-days";

export type PickListWineLine = {
  wineId: string;
  wineName: string;
  vintage: string | null;
  quantity: number;
};

export type PickListSourceGroup = {
  sourceKey: string;
  sourceLabel: string;
  kind: PackingSource["kind"];
  bottles: number;
  boxes: number;
  pickupAddress: string;
  addressMissing: boolean;
  /** Producer UUID for "Lägg till adress" link; null for wholesaler. */
  producerId: string | null;
  wines: PickListWineLine[];
};

export type DirectBoxPickList = {
  reservationId: string;
  orderDateIso: string;
  targetPickupIso: string;
  latestPickupIso: string;
  sources: PickListSourceGroup[];
  totalBottles: number;
  totalBoxes: number;
};

export type PickListItemInput = {
  wineId: string;
  wineName: string;
  vintage?: string | null;
  quantity: number;
  sourceType?: string | null;
  sourceName?: string | null;
  producerId?: string | null;
  producerName?: string | null;
  producerAddressStreet?: string | null;
  producerAddressPostcode?: string | null;
  producerAddressCity?: string | null;
  region?: string | null;
};

export function boxesFromBottles(bottles: number): number {
  return targetBoxCountFromBottles(bottles);
}

export function resolvePickupAddressForSource(
  source: PackingSource,
  item: PickListItemInput,
): string {
  if (source.kind === "wholesaler") {
    return (
      wholesalerPickupAddressFallback(item.sourceName) ?? ADDRESS_MISSING_LABEL
    );
  }
  return formatProducerPickupAddress({
    address_street: item.producerAddressStreet,
    address_postcode: item.producerAddressPostcode,
    address_city: item.producerAddressCity,
  });
}

export function buildDirectBoxPickList(args: {
  reservationId: string;
  orderDate: Date | string;
  items: ReadonlyArray<PickListItemInput>;
}): DirectBoxPickList {
  const orderDate =
    args.orderDate instanceof Date
      ? args.orderDate
      : new Date(args.orderDate);
  const { targetPickupAt, latestPickupAt } =
    directBoxPickupDeadlines(orderDate);

  type Acc = {
    source: PackingSource;
    bottles: number;
    pickupAddress: string;
    producerId: string | null;
    wines: Map<string, PickListWineLine>;
  };
  const byKey = new Map<string, Acc>();

  for (const item of args.items) {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (qty <= 0) continue;

    const source = resolvePackingSource({
      sourceType: item.sourceType,
      sourceName: item.sourceName,
      producerId: item.producerId,
      displayName: item.producerName ?? item.sourceName,
      region: item.region,
    });

    let acc = byKey.get(source.id);
    if (!acc) {
      const producerId =
        source.kind === "producer"
          ? String(item.producerId ?? "").trim() || null
          : null;
      acc = {
        source,
        bottles: 0,
        pickupAddress: resolvePickupAddressForSource(source, item),
        producerId,
        wines: new Map(),
      };
      byKey.set(source.id, acc);
    }
    acc.bottles += qty;

    const wineKey = item.wineId || item.wineName;
    const existing = acc.wines.get(wineKey);
    if (existing) {
      existing.quantity += qty;
    } else {
      acc.wines.set(wineKey, {
        wineId: item.wineId,
        wineName: item.wineName,
        vintage: item.vintage ?? null,
        quantity: qty,
      });
    }
  }

  const sources: PickListSourceGroup[] = [...byKey.values()]
    .map((acc) => {
      const addressMissing = acc.pickupAddress === ADDRESS_MISSING_LABEL;
      return {
        sourceKey: acc.source.id,
        sourceLabel: acc.source.displayName,
        kind: acc.source.kind,
        bottles: acc.bottles,
        boxes: boxesFromBottles(acc.bottles),
        pickupAddress: acc.pickupAddress,
        addressMissing,
        producerId: acc.producerId,
        wines: [...acc.wines.values()].sort((a, b) =>
          a.wineName.localeCompare(b.wineName, "sv"),
        ),
      };
    })
    .sort((a, b) => a.sourceLabel.localeCompare(b.sourceLabel, "sv"));

  const totalBottles = sources.reduce((s, g) => s + g.bottles, 0);
  const totalBoxes = sources.reduce((s, g) => s + g.boxes, 0);

  return {
    reservationId: args.reservationId,
    orderDateIso: formatIsoDateUTC(orderDate),
    targetPickupIso: formatIsoDateUTC(targetPickupAt),
    latestPickupIso: formatIsoDateUTC(latestPickupAt),
    sources,
    totalBottles,
    totalBoxes,
  };
}

export { PACK_BOTTLES_PER_SOURCE };
