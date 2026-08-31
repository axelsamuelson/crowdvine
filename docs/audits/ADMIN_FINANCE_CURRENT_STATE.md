# Admin Finance — Current State Audit

Date: 2026-08-31  
Scope: Read-only audit of CrowdVine / PACT / Dirtywine economics before Finance phase implementation.  
Baseline tests before this phase: **259 passed / 0 failed** (`pnpm test`).

## Verdict

There is **no dedicated Admin Finance section**. There is a mature **frozen unit-economics / shadow contribution** stack for PACT B2C pallet reservations, plus a separate **Dirtywine B2B invoice** order store without frozen contribution snapshots. **No OpEx schema exists.**

---

## Existing financial data sources

### 1. `order_reservation_items.economics_snapshot` (JSONB) + `pre_pallet_contribution_cents`

| Aspect | Detail |
|--------|--------|
| Meaning | Frozen per-bottle unit economics at reservation-item insert (checkout confirm) |
| Actual vs mutable | **Frozen** at write; quantity rescale may update `pre_pallet_contribution_cents` from frozen unit values |
| PACT vs Dirtywine | **PACT B2C only** (checkout → `order_reservations`) |
| Key fields | See `UnitEconomicsSnapshot` in `lib/pallet-contribution.ts` |
| Schema | `migrations/195_pallet_contribution_economics_snapshot.sql` |

### 2. `order_reservations`

| Field | Meaning |
|-------|---------|
| `total_sek` | Charged/expected total (product ± shipping − discounts); **shipping not stored separately** |
| `discount_amount_sek` | Promo SEK |
| `pallet_id` | PACT pallet assignment |
| Statuses | Fill-eligible statuses drive bottle/contribution meters |

No `shipping_sek` / `shipping_revenue_gross_cents` column today → historical shipping reconstruction is lossy.

### 3. `pallets` + `pallet_freight_quotes`

| Field / source | Meaning |
|----------------|---------|
| `cost_cents` | Legacy inbound freight (also used to **amortize customer shipping charge**) |
| `freight_target_cents` | Manual override for shadow inbound target |
| `selected_inbound_freight_quote_*` / quotes table | Prefer selected economically usable quote via `resolveFreightTargetCents` |
| `min_bottles_to_complete` | **120** live readiness (unchanged by finance) |
| `bottle_capacity` | **720** physical capacity |
| `last_mile_cost_cents_per_bottle` | Legacy last-mile; still used for **customer shipping charge** |

### 4. `outbound_freight_quotes`

Checkout-time Instabee/Budbee estimate; allocated into snapshot `unit_last_mile_cost_cents`. Incomplete quotes mark snapshot `incomplete` (not silent zero).

### 5. `dirty_wine_orders`

| Aspect | Detail |
|--------|--------|
| Schema | `migrations/118_dirty_wine_orders.sql` |
| Types | `offline` (admin invoice) / `online` (future) |
| Money | `total_cents` + `invoice_data` JSONB (`InvoiceData`) |
| Frozen economics | **None** — no `economics_snapshot` |
| Payment | Invoice / bank — **not Stripe** by default |
| VAT | Invoice `taxRate` (typically B2B ex-VAT + tax) |

### 6. `wines` / producers

Live catalog costs (`cost_amount`, `cost_currency`, `exchange_rate`, `alcohol_tax_cents`, `base_price_cents`). Used at snapshot time for PACT; **must not** replace frozen snapshot values for actuals.

### 7. OpEx / budgets / accounting tables

**No existing OpEx source of truth.** Grep of migrations/`lib`/`app` found no `opex`, `finance_opex`, operating-expense, or budget ledger for management OpEx.

---

## Existing calculations

### GM1 (already named in admin pallet UI)

Implemented in `lib/admin-pallet-operating-summary.ts` → `deriveContributionMargins`:

```
GM1 = productNetRevenue − purchaseCost − excise
GM1% = GM1 / productNetRevenue
```

Does **not** include shipping, Stripe, outbound, EPR, refund reserve, inbound freight, or OpEx.

### GM2 / pre-pallet contribution

Canonical formula in `lib/pallet-contribution.ts` → `calculateUnitPrePalletContributionCents`:

```
net product revenue
+ net customer shipping revenue
− producer purchase cost
− alcohol excise
− payment fee
− outbound / last-mile
− EPR
− refund/breakage reserve
```

Admin labels this **GM2** and asserts GM2 ≡ pre-pallet contribution.

GM2% on pallet screen uses **net product revenue** as denominator.

### Inbound freight

`resolveFreightTargetCents`: manual `freight_target_cents` → selected inbound quote SEK → legacy `cost_cents`.

**Not deducted inside GM1/GM2.** Shadow meter compares accumulated GM2 to freight target.

### Outbound

New checkouts: allocated `outbound_freight_quotes` into `unit_last_mile_cost_cents`.  
Legacy: flat last-mile. Incomplete Instabee config → incomplete snapshot.

### Shipping revenue

Passed into `buildReservationItemEconomicsRows({ shippingRevenueGrossCents })`, allocated by bottle weights, netted with VAT (`grossToNetCents(..., true, vatRate)`).

### Payment fees

Assumptions in `lib/contribution-assumptions.ts`: Stripe % + fixed fee; % base = paid product gross + shipping gross.

### EPR / refund reserve

Config-driven assumptions (`eprCentsPerBottle`, `refundBreakageReserveRate` × net product).

### VAT

B2C default 25% when `price_includes_vat`. Shipping gross assumed VAT-inclusive when netting.

### FX

Contribution path: `lib/exchange-rate-strict.ts` — **never FX=1 for unknown non-SEK**.  
Older `lib/b2b-wine-cost.ts` `getEffectiveExchangeRate` can fall back to 1 — **do not use for Finance actuals**.

---

## PACT flow (checkout → snapshot)

1. Cart + pallet selected.
2. `shippingSek = calculateCartShippingCost(...)` =  
   `(pallet.cost_cents / bottle_capacity) * bottles + last_mile_per_bottle * bottles`  
   (`lib/shipping-calculations.ts`).
3. Stripe amount = subtotal + shipping − discounts (`lib/checkout/expected-amount.ts`).
4. Outbound Instabee quote created (carrier **cost**, separate from customer shipping charge).
5. `buildReservationItemEconomicsRows` freezes unit snapshot + `pre_pallet_contribution_cents`.
6. Admin pallet detail rolls up via `aggregateContributionEconomicsBreakdown` → GM1/GM2 UI.

Callers of `buildReservationItemEconomicsRows`:

| Caller | Shipping input |
|--------|----------------|
| `app/api/checkout/confirm/route.ts` | `shippingGrossCentsTotal` from live `shippingSek` |
| `lib/backfill-reservation-economics-snapshots.ts` | **Hardcoded `0`** |

---

## Dirtywine flow

**Channel identity:** Dirtywine = B2B portal on `dirtywine.se` (`lib/b2b-site.ts`), not a fragile string heuristic.

**Orders today:** Admin-created offline invoices in `dirty_wine_orders` (`invoice_data` JSONB). Online checkout integration marked future in migration comment.

**Economics available:** invoice line prices, discounts, tax rate, optional `shippingHandlingAmount`, grand total. **No frozen COGS/excise/outbound/inbound snapshots.** Purchase cost must be reconstructed carefully or marked incomplete.

**B2B pallets** (`app/admin/pallets/b2b/*`) are a separate logistics track — not the same as Dirtywine invoice orders. Finance must not assume Dirtywine ≡ every B2B pallet.

---

## Shipping revenue finding (critical)

### Where customer shipping charge is stored

| Location | Stored? |
|----------|---------|
| Ephemeral checkout quote (`shipping_sek`) | Yes, ephemeral |
| Stripe expected amount (includes shipping) | Yes, as part of total |
| `order_reservations` dedicated shipping column | **No** |
| Snapshot `unit_shipping_revenue_*` | Yes, at write time |

### What is passed to `shippingRevenueGrossCents`

Live confirm: `Math.round(shippingSek * 100)` from `calculateCartShippingCost`.  
Backfill: **always 0**.

### Why a 30-bottle pallet can show 0 SEK shipping revenue

Most likely combination:

1. **Charge formula zeros out** when `pallets.cost_cents = 0` **and** last-mile override/env = 0 (common after inbound moved to freight quotes and outbound moved to Instabee). Then live checkout correctly records **0 charged shipping** while outbound carrier cost (e.g. 345 SEK) is still snapshotted → GM2 collapses.
2. **Legacy/backfill rows** explicitly set shipping revenue to 0 even when historical charges may have included shipping.
3. **No reconstructable shipping column** on reservations — only `total_sek` vs product lines can be used for best-effort inference.

**Do not invent ~100 SEK/6 bottles into actuals.** That figure matches the *legacy* amortization model, not necessarily what was charged on a given order.

### Future fix direction (authorized in Finance phase)

- Persist charged shipping on the reservation at confirm time.
- Completeness warning when shipping revenue = 0 but outbound cost > 0.
- Read-only historical audit/classifier (no production backfill without separate auth).
- Changing the **customer charge formula** (to restore non-zero shipping) is a **pricing/checkout product change**, not a silent finance rewrite — flag separately if `cost_cents`/last-mile no longer fund shipping.

---

## Admin structure

- Shell: `app/admin/layout.tsx` → `AdminLayoutClient` → `components/admin/sidebar.tsx`
- Top-level: Översikt, Analytics — **no Finance**
- Analytics (`app/admin/analytics/*`) = traffic/intent, not management accounting
- Richest finance UI: pallet detail GM1/GM2 (`components/admin/admin-pact-pallet-status-summary.tsx`)

---

## Gaps for Finance

| Gap | Severity |
|-----|----------|
| No `/admin/finance` | Product |
| Shipping revenue 0 vs outbound cost | High (GM2 trust) |
| Shipping not persisted on reservation | High (reconstruction) |
| Dirtywine lacks frozen economics | High |
| No GM3 / inbound allocation in reporting | Medium |
| No OpEx model | Medium |
| No scenario / pricing simulator | Medium |
| No channel filter in economics admin | Medium |
| Instabee outbound incomplete (WINE_BOX_6, expired rate) | Known — honor incomplete |
| B2B wine cost FX=1 fallback | Do not use for actuals |

---

## Invariants to preserve

- Live readiness: `min_bottles_to_complete = 120`; capacity `720`
- Shadow economics informational only
- Missing economics ≠ silent zero
- Frozen historical snapshots not rewritten by simulator
- No production wine price / freight quote / payment mutation from Finance UI
