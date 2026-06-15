import { PALLET_ZONE_PRIORITY_THRESHOLD } from "@/lib/pallet-auto-management";

export type B2bPickupProducerInfo = {
  id: string;
  name: string;
  is_pallet_zone: boolean;
  address_street?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  region?: string | null;
  subregion?: string | null;
  lat?: number | null;
  lon?: number | null;
};

export type B2bPickupResolution = {
  totalBottles: number;
  /** Producer selected as pickup point (pallet-zone leader ≥ 20% of bottles). */
  pickupProducer: B2bPickupProducerInfo | null;
  /** Best pallet-zone producer by bottles, even if below threshold. */
  leadingPalletZoneProducer: B2bPickupProducerInfo | null;
  leadingPalletZoneBottles: number;
  belowThreshold: boolean;
  noPalletZoneOnPallet: boolean;
};

export function formatProducerAddress(
  producer: Pick<
    B2bPickupProducerInfo,
    | "address_street"
    | "address_city"
    | "address_postcode"
    | "region"
    | "subregion"
  >,
): string | null {
  const street = producer.address_street?.trim();
  const postcode = producer.address_postcode?.trim();
  const city = producer.address_city?.trim();
  const line1 = [street, [postcode, city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  if (line1) return line1;
  const regionParts = [producer.subregion?.trim(), producer.region?.trim()].filter(
    Boolean,
  );
  return regionParts.length > 0 ? regionParts.join(" · ") : null;
}

/** Unique producers represented on a B2B pallet (by line items). */
export function collectProducersOnPallet(
  items: Array<{
    quantity: number;
    producer?: B2bPickupProducerInfo | null;
  }>,
): B2bPickupProducerInfo[] {
  const byId = new Map<string, B2bPickupProducerInfo>();
  for (const item of items) {
    const producer = item.producer;
    if (!producer?.id) continue;
    if (Math.max(0, Math.floor(item.quantity || 0)) <= 0) continue;
    if (!byId.has(producer.id)) byId.set(producer.id, producer);
  }
  return [...byId.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );
}

export function resolveEffectiveB2bPickupProducer(options: {
  pickupProducerId: string | null;
  producersOnPallet: B2bPickupProducerInfo[];
  autoResolution: B2bPickupResolution;
}): {
  producer: B2bPickupProducerInfo | null;
  mode: "manual" | "auto" | "none";
} {
  const { pickupProducerId, producersOnPallet, autoResolution } = options;
  if (pickupProducerId) {
    const manual = producersOnPallet.find((p) => p.id === pickupProducerId);
    if (manual) return { producer: manual, mode: "manual" };
  }
  if (autoResolution.pickupProducer) {
    return { producer: autoResolution.pickupProducer, mode: "auto" };
  }
  return { producer: null, mode: "none" };
}

/** Resolve pickup producer from B2B pallet line items (same 20% pallet-zone rule as PACT). */
export function resolveB2bPickupProducer(
  items: Array<{
    quantity: number;
    producer?: B2bPickupProducerInfo | null;
  }>,
): B2bPickupResolution {
  const totalBottles = items.reduce(
    (sum, item) => sum + Math.max(0, Math.floor(item.quantity || 0)),
    0,
  );

  if (totalBottles === 0) {
    return {
      totalBottles: 0,
      pickupProducer: null,
      leadingPalletZoneProducer: null,
      leadingPalletZoneBottles: 0,
      belowThreshold: false,
      noPalletZoneOnPallet: true,
    };
  }

  const counts = new Map<string, { bottles: number; producer: B2bPickupProducerInfo }>();
  for (const item of items) {
    const producer = item.producer;
    if (!producer?.id) continue;
    const qty = Math.max(0, Math.floor(item.quantity || 0));
    if (qty === 0) continue;
    const curr = counts.get(producer.id) ?? { bottles: 0, producer };
    curr.bottles += qty;
    counts.set(producer.id, curr);
  }

  const palletZoneEntries = [...counts.values()].filter(
    (entry) => entry.producer.is_pallet_zone && entry.bottles > 0,
  );

  if (palletZoneEntries.length === 0) {
    return {
      totalBottles,
      pickupProducer: null,
      leadingPalletZoneProducer: null,
      leadingPalletZoneBottles: 0,
      belowThreshold: false,
      noPalletZoneOnPallet: true,
    };
  }

  palletZoneEntries.sort((a, b) => {
    if (b.bottles !== a.bottles) return b.bottles - a.bottles;
    return a.producer.name.localeCompare(b.producer.name, "sv");
  });

  const leader = palletZoneEntries[0];
  const threshold = Math.floor(totalBottles * PALLET_ZONE_PRIORITY_THRESHOLD);
  const meetsThreshold = leader.bottles >= threshold;

  return {
    totalBottles,
    pickupProducer: meetsThreshold ? leader.producer : null,
    leadingPalletZoneProducer: leader.producer,
    leadingPalletZoneBottles: leader.bottles,
    belowThreshold: !meetsThreshold,
    noPalletZoneOnPallet: false,
  };
}
