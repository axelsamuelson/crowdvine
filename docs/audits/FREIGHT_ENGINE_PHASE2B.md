# Freight pricing engine — Phase 2B

Date: 2026-08-15  
Scope: Generic inbound freight providers / rates / pallet quote snapshots. Shadow contribution only.

## Data model

| Table | Role |
|-------|------|
| `logistics_providers` | Carrier catalogue (Hillebrand, future Instabee, …) |
| `freight_services` | Lane / product (`INBOUND`/`OUTBOUND`, transport mode, RATE_CARD vs SPOT) |
| `freight_rates` | Base commercial price + weight/pallet limits + validity |
| `freight_rate_components` | Surcharges / add-ons (fixed, per kg, %, spot) |
| `pallet_freight_quotes` | Frozen per-pallet quote instance + FX + SEK total |
| `pallets.selected_inbound_freight_quote_id` | Selected quote pointer |

## Freight rate vs pallet quote

- **Rate catalogue** is reusable and may change (new fuel % rows with `valid_from`).
- **Pallet freight quote** freezes base, components, amounts, FX, and SEK total.
- Changing a live rate card must **not** mutate historical `pallet_freight_quotes`.

## Hillebrand configuration (seed)

Provider `HILLEBRAND`:

1. **FR34 → Sweden via Amsterdam** — `MULTIMODAL`, `RATE_CARD`  
   - Base €308 / EUR pallet / max 800 kg  
   - Fuel 17.1% `PERCENT_OF_BASE` (mandatory)  
   - Emergency fuel 8.6% `PERCENT_OF_BASE` (mandatory)  
   - Pallet cover / Cooling — optional `SPOT_QUOTE` (price unknown)

2. **FR34 → Sweden Road** — `ROAD`, `SPOT_QUOTE` (no invented price)

## Cost calculation rules

1. Resolve base (or service spot amount).
2. Resolve non-percentage components.
3. Apply `PERCENT_OF_BASE` on **original base only**.
4. Apply `PERCENT_OF_SUBTOTAL` on base + non-percentage components.
5. Never compound percentage-on-percentage.
6. Unknown mandatory/selected spot amounts → `canCalculate = false` (never treat as zero).

## Rounding

- Persist **integer minor units** (EUR cents / SEK öre).
- `%` → `Math.round(baseMinor * percent / 100)`.
- Display major = minor / 100 (2 decimals).

Example: `30800 * 17.1% = 5266.8 → 5267` (€52.67).

## FX snapshot

- At quote finalize, call strict FX (`fetchExchangeRateToSekStrict`).
- Reject API `fallback: true` and never use FX = 1 for non-SEK.
- Freeze `fx_rate_to_sek` + `total_cost_sek_cents` on the quote.

## Spot quotes

Enter amount on the **pallet quote**, not by mutating the rate card.

## Optional add-ons

Toggle on pallet quote. If selected and `SPOT_QUOTE` without amount → incomplete.

## Freight target precedence (shadow)

1. `pallets.freight_target_cents` if > 0  
2. Selected quote `total_cost_sek_cents` if economically usable  
3. Legacy `pallets.cost_cents`  
4. 0

## Shadow mode guarantees

- Live `is_complete` still follows `min_bottles_to_complete` (120).
- Physical capacity remains `bottle_capacity` (720).
- Customer PDP/checkout/shipping amortization unchanged.
- Contribution / freight quotes are admin-only.

## Stripe fee correction

Percentage fee base = **paid product gross + allocated customer shipping gross**.  
Fixed fee (1.80 SEK) applied **once per checkout payment**, allocated by bottle weights across reservation groups/items.

## Contribution FX safety

Non-SEK wine without reliable FX → snapshot `incomplete`, `pre_pallet_contribution_cents = null` (excluded from economic meter). No fake 1:1.

## Known limitations

- Pallet cover / cooling prices unknown  
- Road spot-only  
- Lead times not supplied  
- Pallet weight not modeled → compatibility often `UNKNOWN`  
- Outbound Instabee rate engine not implemented (schema supports `OUTBOUND`)

## Future outbound / Instabee

Use `direction = OUTBOUND`, weight brackets / zones as rate components or future rate dimensions — no inbound-only hardcoding on `pallets`.
