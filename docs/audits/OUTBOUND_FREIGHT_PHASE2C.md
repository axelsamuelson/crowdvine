# Outbound freight / Instabee — Phase 2C

Date: 2026-08-15  
Scope: Budbee Light Home Delivery (Sweden) carrier cost for shadow contribution. Live 120-bottle readiness unchanged.

## Existing outbound audit

### Existing outbound cost fields
- `pallets.last_mile_cost_cents_per_bottle` + `LAST_MILE_COST_CENTS_PER_BOTTLE` — flat öre/bottle estimate used in customer shipping charge and legacy contribution snapshots.

### Existing customer shipping revenue fields
- Checkout charge = pallet linehaul share (`cost_cents / bottle_capacity`) + last-mile öre/bottle.
- Allocated into snapshots as `unit_shipping_revenue_*` (separate from carrier cost).

### Existing parcel/package data
- No packaging dimensions table before this phase.
- Instabee API uses size heuristics (`small`/`medium`) and `bottles * 1500` g weight assumption in webhook.

### Existing delivery provider fields
- `order_reservations.instabee_*` label/tracking columns only.
- Phase 2B catalogue already supports `direction = OUTBOUND`.

### Existing address/zone data
- `user_addresses` + reservation zone/pallet FKs; Budbee availability by postal code.

### Existing snapshot fields
- `unit_last_mile_cost_cents` previously = legacy flat last-mile.
- Phase 2C reuses this field for **allocated outbound quote** on new checkouts; adds outbound metadata.

### Legacy fields that should remain
- `last_mile_cost_cents_per_bottle`, env default, Instabee label columns, inbound freight quotes.

### Missing data required for accurate Instabee pricing
- Wine box L×W×H and tare (not inventable)
- Home Delivery max dimensions (locker dims must not be assumed)
- Post-offer rate after 2026-08-18

## Instabee source pricing

| Item | Value |
|------|-------|
| Provider | Instabee (`INSTABEE`) |
| Service | Budbee Light Home Delivery – Sweden |
| Direction | OUTBOUND |
| Currency | SEK |
| Base | 79 SEK / first 0.5 volumetric kg |
| Increment | +1 SEK / additional 0.5 kg |
| Volumetric | L×W×H (m) × 280, round UP to 0.5 kg |
| Fuel / cross-border | Included in base (no separate fuel surcharge) |
| Valid to | 2026-08-18 |
| Remote area | Norway only — **never apply for SE** |

## Data model

- Extended `freight_rates`: `pricing_basis`, `included_weight_kg`, `weight_increment_kg`, `increment_price_amount`, `volumetric_factor`
- `packaging_profiles` (seed `WINE_BOX_6` with null dimensions, `max_bottles=6`)
- `outbound_freight_quotes` (checkout-level frozen estimate)
- `outbound_freight_adjustments` (post-order actuals path)
- `order_reservation_items.outbound_freight_quote_id`

## Packaging profiles

Configure real L×W×H before volumetric pricing can calculate. Until then checkout outbound quotes are `INCOMPLETE` and contribution snapshots are incomplete (not zero).

## Volumetric weight / rounding / Budbee formula

See `lib/outbound-freight-pricing.ts`. Examples: 0.5→79, 1.0→80, 1.5→81 SEK.

## Surcharges

Catalogue seeded; checkout estimate only applies explicitly selected predictable surcharges. Event-based (recall, undeliverable, …) → adjustments table. Remote area blocked for SE.

## Outbound quote snapshot

Created at checkout confirm (before reservation item economics), idempotent on `idempotency_key` / `checkout_group_id`.

## Estimate vs actual

`estimated_total_minor` + `outbound_freight_adjustments` → `actual_total_minor`. Contribution uses actual if set, else estimate.

## Allocation

One outbound quote per checkout; allocated by bottle quantity across producers/items (`allocatePoolByWeights`). Not × producer.

## Contribution integration

```
net product + net customer shipping
− purchase − excise − Stripe − allocated outbound − EPR − refund reserve
= pre-inbound contribution
```

Customer shipping revenue ≠ Instabee cost.

## Legacy last-mile fallback

Not used for new SE Instabee checkouts. Field retained for customer shipping charge + historical snapshots.

## Shadow-readiness guarantee

120 bottles still control `is_complete`. Outbound only improves shadow contribution inputs.

## Offer expiry

Live rate resolution requires `valid_to >= asOf`. Expired → incomplete. Historical quotes remain frozen.

## Known missing data

- Box dimensions / tare
- Home max dimensions
- Rate after 2026-08-18
- Locker product pricing
- Carrier invoice reconciliation automation

## Phase 2D admin follow-up

Redesign pallet admin to consistently show: 120 vs 720, contribution shadow, inbound quote, outbound economics, legacy vs canonical fields.
