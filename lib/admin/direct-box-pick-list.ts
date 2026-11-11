/**
 * Admin pick list for a direct_box order: boxes per packing source,
 * wine lines, sender address, contact email, and Access Point dropoff deadlines.
 */

import {
  PACK_BOTTLES_PER_SOURCE,
  resolvePackingSource,
  type PackingSource,
} from "@/lib/cart/packing-source";
import { targetBoxCountFromBottles } from "@/lib/cart/packing-source-display";
import {
  ADDRESS_MISSING_LABEL,
  EMAIL_MISSING_LABEL,
  formatProducerSenderAddress,
  wholesalerSenderAddressFallback,
} from "@/lib/admin/direct-box-pickup-addresses";
import {
  directBoxDropoffDeadlines,
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
  /** Avsändaradress (producer address or wholesaler fallback). */
  senderAddress: string;
  addressMissing: boolean;
  /** Producer contact_email when present; null when missing. */
  contactEmail: string | null;
  emailMissing: boolean;
  /** Producer UUID for "Lägg till …" links; null for wholesaler. */
  producerId: string | null;
  wines: PickListWineLine[];
};

export type DirectBoxPickList = {
  reservationId: string;
  orderDateIso: string;
  /** Target Access Point dropoff day (+3 business days). */
  targetDropoffIso: string;
  /** Hard-limit Access Point dropoff day (+5 business days). */
  latestDropoffIso: string;
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
  producerContactEmail?: string | null;
  region?: string | null;
};

export function boxesFromBottles(bottles: number): number {
  return targetBoxCountFromBottles(bottles);
}

export function resolveSenderAddressForSource(
  source: PackingSource,
  item: PickListItemInput,
): string {
  if (source.kind === "wholesaler") {
    return (
      wholesalerSenderAddressFallback(item.sourceName) ?? ADDRESS_MISSING_LABEL
    );
  }
  return formatProducerSenderAddress({
    address_street: item.producerAddressStreet,
    address_postcode: item.producerAddressPostcode,
    address_city: item.producerAddressCity,
  });
}

export function resolveContactEmailForSource(
  source: PackingSource,
  item: PickListItemInput,
): string | null {
  if (source.kind !== "producer") return null;
  const email = String(item.producerContactEmail ?? "").trim();
  return email || null;
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
  const { targetDropoffAt, latestDropoffAt } =
    directBoxDropoffDeadlines(orderDate);

  type Acc = {
    source: PackingSource;
    bottles: number;
    senderAddress: string;
    contactEmail: string | null;
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
        senderAddress: resolveSenderAddressForSource(source, item),
        contactEmail: resolveContactEmailForSource(source, item),
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
      const addressMissing = acc.senderAddress === ADDRESS_MISSING_LABEL;
      const emailMissing =
        acc.source.kind === "producer"
          ? !acc.contactEmail
          : true; /* wholesaler: always "missing", no edit link */
      return {
        sourceKey: acc.source.id,
        sourceLabel: acc.source.displayName,
        kind: acc.source.kind,
        bottles: acc.bottles,
        boxes: boxesFromBottles(acc.bottles),
        senderAddress: acc.senderAddress,
        addressMissing,
        contactEmail: acc.contactEmail,
        emailMissing,
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
    targetDropoffIso: formatIsoDateUTC(targetDropoffAt),
    latestDropoffIso: formatIsoDateUTC(latestDropoffAt),
    sources,
    totalBottles,
    totalBoxes,
  };
}

export { PACK_BOTTLES_PER_SOURCE, EMAIL_MISSING_LABEL };
