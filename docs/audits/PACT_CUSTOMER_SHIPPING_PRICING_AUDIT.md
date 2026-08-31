# PACT customer shipping pricing — audit

Date: 2026-08-31  
Baseline: commit `2984a5fe` (Admin finance), tests **275 passed**, build PASS.  
Scope: Read-only audit before changing the customer shipping **revenue** source of truth.

---

## Current checkout shipping formula

**Module:** `lib/shipping-calculations.ts`  
**Entry:** `calculateCartShippingCost(cartItems, selectedPallet)`

```
linehaul_per_bottle = round(pallet.cost_cents / bottle_capacity)
last_mile_per_bottle = pallet.last_mile_cost_cents_per_bottle
                     OR env LAST_MILE_COST_CENTS_PER_BOTTLE
                     OR 0

shippingSek = (linehaul_per_bottle + last_mile_per_bottle) * bottles_in_order / 100
```

**Callers (all use the same helper):**

| Path | Role |
|------|------|
| `app/api/checkout/quote/route.ts` | Checkout UI quote |
| `app/api/checkout/payment-intent/route.ts` | Stripe amount |
| `app/api/checkout/confirm/route.ts` | Confirm + economics snapshot |
| `app/api/checkout/confirm-stripe-return/route.ts` | Return path amount |
| `lib/reservation-auto-charge.ts` | Deferred charge |
| `app/checkout/checkout-client.tsx` | Client display fallback |

**Flow:**

1. Resolve `shippingSek` from formula above (0 if no pallet / both legs 0).
2. `computeExpectedAmountOre`: subtotal + shipping − discounts → Stripe.
3. Confirm: `shippingGrossCentsTotal = round(shippingSek * 100)`.
4. Multi-producer: allocate by bottle weight across reservations.
5. `buildReservationItemEconomicsRows({ shippingRevenueGrossCents })` freezes unit shipping revenue.
6. Since Finance phase: also persist `order_reservations.shipping_revenue_gross_cents` (migration 205; may be unapplied in prod).

**Free shipping:** UI shows `checkout.shippingFree` when `totalShippingCostCents === 0`. There is **no** threshold/promo free-shipping rule in checkout code (only marketing seed copy).

**Member / promo:** Discounts apply to product; shipping is added after. No member free-shipping rule found.

---

## Why shipping becomes zero

Concrete case (post freight-engine):

- Inbound freight moved to `pallet_freight_quotes` / `freight_target_cents`.
- `pallets.cost_cents` often **0** (legacy linehaul field unused).
- `last_mile_cost_cents_per_bottle` often **0**; Instabee replaced legacy last-mile as **carrier cost**.
- Env `LAST_MILE_COST_CENTS_PER_BOTTLE` may be unset in production.
- Formula → `shippingSek = 0`.
- Outbound Instabee quote can still freeze e.g. **345 SEK** carrier cost into `unit_last_mile_cost_cents`.
- Snapshot correctly records **shipping revenue = 0** (what was charged).
- Finance GM2 correctly shows the bad commercial outcome.

Known 30-bottle historical example: shipping revenue 0, outbound 34 500 öre, GM2 = 296 öre.

---

## Legacy dependencies

| Input | Improperly influences customer shipping? |
|-------|------------------------------------------|
| `pallet.cost_cents` | **Yes** — amortized as customer linehaul revenue |
| `bottle_capacity` (720) | **Yes** — denominator for that amortization |
| `last_mile_cost_cents_per_bottle` / env | **Yes** — dual-used as customer charge *and* old carrier estimate |
| Inbound selected quote / `freight_target_cents` | **No** (not in formula) — but zeroing `cost_cents` when quotes exist creates the failure mode |
| Instabee outbound quote | **No** for customer price (separate cost) |

---

## Outbound cost model

- Engine: `lib/outbound-freight-pricing.ts` + `createOrGetOutboundFreightQuote`
- Carrier: Budbee Light / Instabee — **79 SEK** first 0.5 volumetric kg + 1 SEK/0.5 kg (offer valid_to 2026-08-18; packaging incomplete)
- Persisted: `outbound_freight_quotes`
- Frozen into snapshot as **carrier cost** (`unit_last_mile_cost_cents`)
- Admin freight catalogue explicitly: *"Separat från kundens fraktintäkt"*

**Conceptually different from customer shipping price.** Must stay separate.

---

## Current commercial rules (evidence classification)

| Finding | Class | Notes |
|---------|-------|-------|
| `LAST_MILE_COST_CENTS_PER_BOTTLE=833` in `.env.example` | **B historical/legacy** | 8.33 SEK/bottle last-mile *component* of old formula; not a flat order fee; not proven active in prod |
| Formula = cost_cents/capacity + last-mile | **B historical/legacy** | Active code path, commercially broken after freight quotes |
| Instabee **79 SEK** base | **A for carrier cost** / **D for customer price** | Rate card for what PACT pays — not customer price |
| “~100 SEK / 6 bottles” | **C approximate** | Finance brief / discussion; **not** in checkout code |
| Free shipping thresholds | **D / marketing only** | Seed scripts (“fri frakt”); not implemented in checkout |
| Flat 99 SEK order fee | **D none** | Not found |
| `shipping_regions` price fields | **D none** | Geography only — no fee columns |

**Verdict: no authoritative active flat customer shipping price exists in repo/data.**

Do **not** invent 79/99/100 SEK as customer price.

---

## Data persistence

| Era | What stores customer shipping |
|-----|-------------------------------|
| Pre-snapshot | Only inside Stripe total / ephemeral quote; not a reservation column |
| Snapshot (Phase 2) | `economics_snapshot.unit_shipping_revenue_*` |
| Backfill | Hardcoded shipping **0** |
| Migration **205** | Adds `order_reservations.shipping_revenue_gross_cents` INTEGER NULLABLE (null = legacy); `finance_opex_entries` + RLS |
| Stripe | `amount` / `expected_amount_ore` total only — shipping not a separate line item key |

Historical reconstructability: partial from snapshot if non-backfill; weak from `total_sek − product` (noisy); multi-producer `total_sek` often excludes shipping.

---

## Recommendation (smallest robust architecture)

1. **Separate module** `lib/customer-shipping-pricing.ts` for **customer shipping revenue** only.
2. **Configurable** `customer_shipping_rates` (new table — `shipping_regions` / freight catalogue have no customer-price fields).
3. **Do not seed** a rate — leave unset until business decides SEK amount.
4. Checkout: resolve via config when active; if **no** active rate, keep **legacy formula** as explicit `source: "legacy_pallet_amortization"` so live totals stay unchanged (no invented fee, no silent new fail-closed break of prod).
5. When an active rate exists: use it for quote / Stripe / reservation / snapshot (one amount).
6. Missing-config vs free: only after business enables config; free = explicit `free_shipping` row / flag with `grossCents=0`.
7. Never set customer price = Instabee quote automatically.
8. Never use inbound freight / capacity for customer price in the new path.
9. Apply migration **205** when DB available; add **206** for rates table.
10. Finance: distinguish intentional free zero vs `legacy_shipping_revenue_ambiguous` when shipping=0 and outbound>0 on legacy/backfill rows.
11. Historical: read-only reconstructability audit — **no backfill**.

**Business decision required before enabling paid shipping:**

> PACT Sweden standard customer shipping price: ___ SEK inkl. moms per order  
> Free-shipping threshold (if any): ___  
> Scope: SE home delivery / Budbee Light

Until that is set in admin, Result for “new paid shipping rule” remains **BLOCKED**; architecture can still ship.
