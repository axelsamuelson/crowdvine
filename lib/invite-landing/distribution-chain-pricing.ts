/**
 * Illustrative traditional wine distribution chain (invite landing).
 * TODO: derive from wines.cost_amount + margin when showing live pallet SKUs.
 */

export const ILLUSTRATIVE_PRODUCER_PRICE_KR = 60;
/** Shared freight per bottle (illustrative PACT add-on). */
export const ILLUSTRATIVE_FREIGHT_PER_BOTTLE_KR = 12;

export type ChainStep = {
  id: string;
  label: string;
  markupLabel: string;
  priceKr: number;
  variant: "producer" | "middle" | "retail";
};

const CHAIN_MULTIPLIERS: { label: string; markup: string; mult: number }[] = [
  { label: "Producer", markup: "Ex cellar", mult: 1 },
  { label: "Négociant", markup: "+40%", mult: 1.4 },
  { label: "Importer", markup: "+40%", mult: 1.4 },
  { label: "Distributor", markup: "+30%", mult: 1.3 },
  { label: "Retail", markup: "+57%", mult: 1.57 },
];

export function buildDistributionChain(
  producerPriceKr: number = ILLUSTRATIVE_PRODUCER_PRICE_KR,
): ChainStep[] {
  let price = producerPriceKr;
  return CHAIN_MULTIPLIERS.map((step, i) => {
    if (i > 0) price = price * step.mult;
    const rounded = Math.round(price);
    return {
      id: step.label.toLowerCase().replace(/\s+/g, "-"),
      label: step.label,
      markupLabel: step.markup,
      priceKr: rounded,
      variant:
        i === 0 ? "producer" : i === CHAIN_MULTIPLIERS.length - 1 ? "retail" : "middle",
    };
  });
}

export function illustrativePactPriceKr(
  producerPriceKr: number = ILLUSTRATIVE_PRODUCER_PRICE_KR,
  freightKr: number = ILLUSTRATIVE_FREIGHT_PER_BOTTLE_KR,
): number {
  return Math.round(producerPriceKr + freightKr);
}

export function formatInviteKr(amount: number): string {
  return `${Math.round(amount).toLocaleString("sv-SE")} kr`;
}
