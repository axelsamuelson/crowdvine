# Pallet contribution economics — Phase 2A audit

Date: 2026-08-14  
Scope: B2C reservation / pallet fill economics for shadow contribution readiness.

## Existing canonical revenue fields

| Source | Field | Notes |
|--------|--------|------|
| `wines` | `base_price_cents` | B2C list price in öre, typically inkl. 25% moms |
| Cart lines | `line.cost.totalAmount` | Paid unit after member + early-bird (live at checkout) |
| `order_reservations` | `total_sek` | Final expected/charged amount (may include shipping) |
| `order_reservations` | `discount_amount_sek` | Promo SEK only |
| `CheckoutQuote` | subtotal/shipping/discounts | Ephemeral API quote, not persisted as JSON |

Currency: commercial fields are SEK/öre-centric.

## Existing canonical COGS fields

| Source | Field | Notes |
|--------|--------|------|
| `wines` | `cost_amount`, `cost_currency`, `exchange_rate` | Purchase cost → SEK via FX |
| Helpers | `getWinePurchaseCostCentsPerBottle` | `cost_amount × exchange_rate` in öre |
| `wines.b2b_cost_sek` | Admin B2B display snapshot | Not written at B2C checkout |

## Existing tax fields

| Source | Field | Notes |
|--------|--------|------|
| `wines` | `alcohol_tax_cents` | Alkoholskatt per bottle (öre) |
| Default | `DEFAULT_ALCOHOL_TAX_CENTS = 2219` | 22.19 SEK when unset |
| VAT | `price_includes_vat` / 25% | Reconstruct net as gross / 1.25 |
| Volume/ABV | `volume_liters`, `alcohol_percentage` | Catalog only; not used for live tax |

No separate producer “reduced excise” flag beyond per-wine `alcohol_tax_cents`.

## Existing payment fee fields

**None.** No Stripe fee columns or estimated fee persistence. Charge amount is gross.

## Existing delivery cost fields

| Source | Field | Notes |
|--------|--------|------|
| `pallets` | `last_mile_cost_cents_per_bottle` | Budbee/home delivery öre/bottle |
| Env | `LAST_MILE_COST_CENTS_PER_BOTTLE` | Fallback |
| `lib/shipping-calculations.ts` | linehaul + last-mile | Customer shipping charge |

Shipping is generally **recomputed**, not stored as a reservation column.

## Existing pallet freight fields

| Source | Field | Notes |
|--------|--------|------|
| `pallets.cost_cents` | Whole-pallet inbound linehaul (öre) | Amortized by `bottle_capacity` for customer shipping |
| `pallets.bottle_capacity` | Physical capacity (720) | Freight denominator |
| `pallets.min_bottles_to_complete` | Ship-ready bottle rule (120) | Authoritative completion |

## Existing snapshot fields

Checkout writes `order_reservation_items` with `item_id`, `quantity`, `price_band` only — **no unit price/COGS/tax/shipping snapshot**. Historical displays rejoin live `wines.base_price_cents`.

## Missing data required for contribution

1. Order-time unit revenue after discounts (line snapshot)
2. Order-time purchase cost + FX + excise snapshot
3. Order-time last-mile + allocated shipping revenue
4. Payment fee estimate (config-driven until Stripe settlement)
5. EPR / refund-breakage reserves (not in app — config assumptions)
6. Explicit VAT remittance (derivable)

## Recommended canonical formula

**prePalletContribution** (öre, before inbound pallet freight):

```
net_product_revenue_ex_vat
+ allocated_net_shipping_revenue_ex_vat
− purchase_cost
− excise
− estimated_payment_fee
− last_mile_cost
− epr_reserve
− refund_breakage_reserve
```

**Do not** deduct `pallets.cost_cents` inside this value. Freight target for economic readiness is the pallet’s inbound `cost_cents` (or optional `freight_target_cents`).

### Snapshot timing (chosen)

**Checkout confirm — when `order_reservation_items` are inserted.**

Why:
- Reservation status at insert is `pending_producer_approval` or `conditional_pending`, both in `PALLET_FILL_STATUSES`.
- Paid unit price, order discounts, shipping charge, and wine COGS/FX/excise are known.
- Aligns contribution meter with bottle fill (no lag after payment/approval).
- Earlier (cart) would allow price/COGS drift; later (payment/approval) would lag fill.

Cancelled / rejected / expired reservations leave fill statuses → contribution drops with the same population as `sumReservedBottlesOnPallet`.

Phase 2 keeps `min_bottles_to_complete` (120) as the live trigger; contribution runs in **shadow mode** only.

### Implementation map

| Piece | Location |
|-------|----------|
| Assumptions config | `lib/contribution-assumptions.ts` + env |
| Pure contribution math | `lib/pallet-contribution.ts` |
| Snapshot builder | `lib/reservation-economics-snapshot.ts` |
| Write path | `app/api/checkout/confirm/route.ts` |
| Schema | `migrations/195_pallet_contribution_economics_snapshot.sql` |
| Admin shadow metrics | `/api/admin/pallets` → `shadow_contribution` |
