import type { Product } from "@/lib/shopify/types";
import {
  buildDistributionChain,
  illustrativePactPriceKr,
} from "@/lib/invite-landing/distribution-chain-pricing";

export const INVITE_PALLET_DISPLAY_CAPACITY = 180;
export const INVITE_PALLET_PLACEHOLDER_FILLED = 143;
export const INVITE_DEFAULT_SAVINGS_KR = 120;

export type InvitePalletSnapshot = {
  filled: number;
  capacity: number;
};

export type InviteFeaturedWine = {
  id: string;
  name: string;
  producerName: string;
  region: string;
  producerPriceKr: number | null;
  retailChainKr: number | null;
};

export type InviteActivityItem = {
  wineName: string;
  region: string;
  reservedAgo: string;
};

type PalletRow = {
  id: string;
  capacity_bottles?: number;
  total_bottles_on_pallet?: number;
  status?: string;
};

const PLACEHOLDER_WINES: InviteFeaturedWine[] = [
  {
    id: "ph-1",
    name: "Château Ollieux Romanis Blanc",
    producerName: "Château Ollieux Romanis",
    region: "Languedoc",
    producerPriceKr: null,
    retailChainKr: null,
  },
  {
    id: "ph-2",
    name: "Domaine de l'Arjolle Rouge",
    producerName: "Domaine de l'Arjolle",
    region: "Languedoc",
    producerPriceKr: null,
    retailChainKr: null,
  },
  {
    id: "ph-3",
    name: "Mas de Daumas Gassac",
    producerName: "Mas de Daumas Gassac",
    region: "Languedoc",
    producerPriceKr: null,
    retailChainKr: null,
  },
];

const PLACEHOLDER_ACTIVITY: InviteActivityItem[] = [
  { wineName: "Château Ollieux Romanis Blanc", region: "Languedoc", reservedAgo: "3 min sedan" },
  { wineName: "Domaine de l'Arjolle Rouge", region: "Languedoc", reservedAgo: "12 min sedan" },
  { wineName: "Mas de Daumas Gassac", region: "Languedoc", reservedAgo: "18 min sedan" },
  { wineName: "Clos de l'Origine", region: "Languedoc", reservedAgo: "24 min sedan" },
  { wineName: "Domaine Gayda Figure Libre", region: "Languedoc", reservedAgo: "31 min sedan" },
  { wineName: "Les Clos Perdus Corbières", region: "Languedoc", reservedAgo: "45 min sedan" },
];

export const PLACEHOLDER_PRODUCERS = [
  "Château Ollieux Romanis",
  "Domaine de l'Arjolle",
  "Mas de Daumas Gassac",
  "Clos de l'Origine",
  "Domaine Gayda",
];

function producerPriceKrFromProduct(product: Product): number | null {
  const pb = product.priceBreakdown;
  if (!pb?.costAmount || !pb.exchangeRate) return null;
  const kr = Math.round(pb.costAmount * pb.exchangeRate);
  return kr > 0 ? kr : null;
}

function retailChainKrFromProducer(producerKr: number): number {
  const chain = buildDistributionChain(producerKr);
  return chain[chain.length - 1]?.priceKr ?? producerKr;
}

export function savingsKrForProducerPrice(producerKr: number): number {
  const retail = retailChainKrFromProducer(producerKr);
  const pact = illustrativePactPriceKr(producerKr);
  return Math.max(0, retail - pact);
}

/** Average per-bottle savings from product list, or null if none computable. */
export function averageSavingsKrFromProducts(
  products: Product[] | undefined,
): number | null {
  if (!products?.length) return null;

  const amounts: number[] = [];
  for (const p of products) {
    const producerKr = producerPriceKrFromProduct(p);
    if (producerKr == null) continue;
    amounts.push(savingsKrForProducerPrice(producerKr));
  }

  if (amounts.length === 0) return null;
  return Math.round(
    amounts.reduce((a, b) => a + b, 0) / amounts.length,
  );
}

export function mapProductsToFeaturedWines(
  products: Product[] | undefined,
  limit = 3,
): InviteFeaturedWine[] {
  if (!products?.length) return PLACEHOLDER_WINES;

  const mapped = products.slice(0, limit).map((p) => {
    const producerKr = producerPriceKrFromProduct(p);
    const region =
      (p.specs?.Region as string | undefined) ||
      (p.specs?.Appellation as string | undefined) ||
      "Languedoc";

    return {
      id: p.id,
      name: p.title,
      producerName: p.producerName || "Producent",
      region,
      producerPriceKr: producerKr,
      retailChainKr:
        producerKr != null ? retailChainKrFromProducer(producerKr) : null,
    };
  });

  while (mapped.length < limit) {
    mapped.push(PLACEHOLDER_WINES[mapped.length % PLACEHOLDER_WINES.length]);
  }

  return mapped;
}

export function mapProductsToActivity(
  products: Product[] | undefined,
): InviteActivityItem[] {
  if (!products?.length) return PLACEHOLDER_ACTIVITY;

  const times = ["3 min sedan", "7 min sedan", "12 min sedan", "18 min sedan", "24 min sedan", "31 min sedan"];
  return products.slice(0, 6).map((p, i) => ({
    wineName: p.title,
    region:
      (p.specs?.Region as string | undefined) ||
      (p.specs?.Appellation as string | undefined) ||
      "Languedoc",
    reservedAgo: times[i % times.length],
  }));
}

export function pickInvitePallet(rows: PalletRow[] | undefined): InvitePalletSnapshot {
  if (!rows?.length) {
    return {
      filled: INVITE_PALLET_PLACEHOLDER_FILLED,
      capacity: INVITE_PALLET_DISPLAY_CAPACITY,
    };
  }

  const active = rows.filter((p) => {
    const s = (p.status ?? "").toLowerCase();
    return s !== "shipped" && s !== "delivered";
  });
  const pool = active.length > 0 ? active : rows;
  const best = [...pool].sort(
    (a, b) =>
      (b.total_bottles_on_pallet ?? 0) - (a.total_bottles_on_pallet ?? 0),
  )[0];

  const rawFilled = Math.max(0, best?.total_bottles_on_pallet ?? 0);
  const capacity = Math.min(
    INVITE_PALLET_DISPLAY_CAPACITY,
    best?.capacity_bottles ?? INVITE_PALLET_DISPLAY_CAPACITY,
  );
  const filled = Math.min(
    capacity,
    rawFilled > 0 ? rawFilled : INVITE_PALLET_PLACEHOLDER_FILLED,
  );

  return { filled, capacity };
}

export function uniqueProducerNames(products: Product[] | undefined): string[] {
  if (!products?.length) return PLACEHOLDER_PRODUCERS;
  const names = products
    .map((p) => p.producerName?.trim())
    .filter((n): n is string => Boolean(n));
  const unique = [...new Set(names)];
  return unique.length > 0 ? unique.slice(0, 8) : PLACEHOLDER_PRODUCERS;
}
