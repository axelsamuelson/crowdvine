/**
 * Realistic wine pricing fixtures for golden / cross-surface tests.
 *
 * Values mirror live catalog rows (cost, FX, alcohol tax, margins, stored
 * base_price_cents) plus representative B2B pallet shipping-per-bottle.
 * Do not "fix" fixtures to make surfaces agree — they document today's truth.
 */

export type PricingGoldenWine = {
  /** Stable fixture id (not a DB uuid). */
  id: string;
  label: string;
  cost_amount: number;
  cost_currency: string;
  exchange_rate: number;
  alcohol_tax_cents: number;
  /** B2C gross margin % used by wine-retail-pricing. */
  margin_percentage: number;
  /** B2B margin % used by price-breakdown / inquiry / pallet commercial. */
  b2b_margin_percentage: number;
  /** Stored shop list price in öre (may differ from a live recalculation). */
  base_price_cents: number;
  price_includes_vat: boolean;
  /** Typical full-pallet shipping SEK/bottle (e.g. 400 kr / 600 bottles). */
  shipping_per_bottle_sek: number;
};

/** 400 SEK pallet freight ÷ 600 bottles — same as b2b-pallet-shipping tests. */
export const TYPICAL_PALLET_SHIPPING_PER_BOTTLE_SEK = 400 / 600;

/** Admin Up Tempo breakdown case: ~6.67 SEK/bottle freight. */
export const UP_TEMPO_BREAKDOWN_SHIPPING_PER_BOTTLE_SEK = 6.666666666666667;

/**
 * Handful of representative live wines (EUR import + one SEK B2B card case).
 * base_price_cents is the stored catalog value as of the consolidation snapshot.
 */
export const PRICING_GOLDEN_WINES: PricingGoldenWine[] = [
  {
    id: "a-love-supreme-2024",
    label: "A Love Supreme 2024",
    cost_amount: 7,
    cost_currency: "EUR",
    exchange_rate: 11.13,
    alcohol_tax_cents: 2219,
    margin_percentage: 20,
    b2b_margin_percentage: 20,
    base_price_cents: 15641,
    price_includes_vat: true,
    shipping_per_bottle_sek: TYPICAL_PALLET_SHIPPING_PER_BOTTLE_SEK,
  },
  {
    id: "up-tempo-2024",
    label: "Up Tempo 2024",
    cost_amount: 8,
    cost_currency: "EUR",
    exchange_rate: 11.13,
    alcohol_tax_cents: 2219,
    margin_percentage: 20,
    b2b_margin_percentage: 20,
    base_price_cents: 17380,
    price_includes_vat: true,
    shipping_per_bottle_sek: TYPICAL_PALLET_SHIPPING_PER_BOTTLE_SEK,
  },
  {
    id: "hippie-killer-2023",
    label: "Hippie Killer 2023",
    cost_amount: 5.5,
    cost_currency: "EUR",
    exchange_rate: 11.13,
    alcohol_tax_cents: 2219,
    margin_percentage: 20,
    b2b_margin_percentage: 20,
    base_price_cents: 13032,
    price_includes_vat: true,
    shipping_per_bottle_sek: TYPICAL_PALLET_SHIPPING_PER_BOTTLE_SEK,
  },
  {
    id: "blanc-de-noir-2024",
    label: "Blanc de Noir 2024",
    cost_amount: 9.9,
    cost_currency: "EUR",
    exchange_rate: 11.13,
    alcohol_tax_cents: 2219,
    margin_percentage: 20,
    b2b_margin_percentage: 20,
    base_price_cents: 20684,
    price_includes_vat: true,
    shipping_per_bottle_sek: TYPICAL_PALLET_SHIPPING_PER_BOTTLE_SEK,
  },
  {
    id: "flore-et-sens-2023",
    label: "Flore Et Sens 2023",
    cost_amount: 7.5,
    cost_currency: "EUR",
    exchange_rate: 11.12,
    alcohol_tax_cents: 2219,
    margin_percentage: 20,
    b2b_margin_percentage: 20,
    base_price_cents: 16498,
    price_includes_vat: true,
    shipping_per_bottle_sek: UP_TEMPO_BREAKDOWN_SHIPPING_PER_BOTTLE_SEK,
  },
  {
    // Dirty Wine card / inquiry reference: SEK cost + 30% B2B margin → 132 kr
    id: "resiste-sek-b2b-card",
    label: "Résiste (SEK cost B2B card fixture)",
    cost_amount: 70,
    cost_currency: "SEK",
    exchange_rate: 1,
    alcohol_tax_cents: 2219,
    margin_percentage: 20,
    b2b_margin_percentage: 30,
    base_price_cents: 15700,
    price_includes_vat: true,
    shipping_per_bottle_sek: 0,
  },
];

export function wineById(id: string): PricingGoldenWine {
  const wine = PRICING_GOLDEN_WINES.find((w) => w.id === id);
  if (!wine) throw new Error(`Unknown pricing golden wine id: ${id}`);
  return wine;
}
