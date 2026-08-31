# Admin Finance — Phase 1 architecture

Date: 2026-08-31  
Related audit: `docs/audits/ADMIN_FINANCE_CURRENT_STATE.md`

## Business definitions

| Term | Formula | Denominator |
|------|---------|-------------|
| **GM1** | Net product revenue − producer purchase − alcohol excise | Net product revenue |
| **GM2** | GM1 + net shipping revenue − payment fees − outbound − EPR − refund reserve (= `prePalletContribution`) | Net product revenue (primary; total net optional) |
| **GM3** | GM2 − allocated inbound freight | Net product revenue |
| **OpEx** | Normalized admin-managed expenses | Below GM3 |
| **Operating result** | GM3 − allocated OpEx | — |

All money aggregated in **integer öre**. Percentages from **sum/sum**, never avg of line %.

## Existing sources reused

- `lib/pallet-contribution.ts` — snapshot type, pre-pallet math, freight target
- `lib/admin-pallet-operating-summary.ts` — `deriveContributionMargins`, snapshot rollup
- `lib/reservation-economics-snapshot.ts` — checkout snapshot builder
- `lib/contribution-assumptions.ts` — Stripe/EPR/refund/VAT assumptions
- `order_reservation_items.economics_snapshot` — PACT actuals SoT
- `dirty_wine_orders.invoice_data` — Dirtywine revenue SoT (no frozen COGS)

## PACT data flow

Checkout confirm → `shippingSek` from `calculateCartShippingCost` → snapshot + **new** `order_reservations.shipping_revenue_gross_cents` → Finance aggregates known non-incomplete snapshots.

## Dirtywine data flow

`dirtywine.se` / B2B portal (`lib/b2b-site.ts`) → admin offline invoices in `dirty_wine_orders` → revenue/shipping from invoice JSON. Margins withheld until matched COGS exists.

## Actual vs scenario

| Mode | Source | Mutates production? |
|------|--------|---------------------|
| Actuals | Frozen snapshots / invoices | No |
| Scenarios | Ephemeral `/api/admin/finance/simulate` | **No** (no Apply) |

Forecast GM3 uses assumed ship qty (120/240/…/720); never presented as realized inbound on open pallets.

## Shipping revenue finding

- Live path already passes `shippingRevenueGrossCents` from charged `shippingSek`.
- Charge = `cost_cents/capacity + last_mile` — often **0** when inbound moved to quotes and last-mile env unset, while Instabee outbound cost still freezes → GM2 understated vs business intent.
- Backfill helper hardcodes shipping **0**.
- Finance persists charged shipping on new reservations; flags `shipping_zero_with_outbound`; **no historical backfill executed**.

## Inbound allocation methodology

Bottle-count: `inbound_total / assumed_or_shipped_bottles`, allocated by quantity (largest remainder for multi-line). Actual vs forecast labeled explicitly.

## OpEx model

Table `finance_opex_entries` (migration 205). Empty by default. Cadence monthly/annual/one_off; channel pact/dirtywine/shared; shared requires explicit PACT % or stays unallocated.

## Data completeness

Known margins = non-incomplete snapshots only. Warnings for missing FX/outbound, shipping=0+outbound>0, Dirtywine missing COGS, legacy schemas. Coverage % = known bottles / total bottles.

## Security

All `/api/admin/finance/**` call `requireAdmin()` first. No Stripe secrets or payment raw dumps.

## Known limitations

- Dirtywine online checkout + frozen COGS not built
- Instabee outbound may be incomplete (existing Phase 2C)
- Customer shipping **charge formula** may still yield 0 (product issue separate from snapshot persistence)
- Wine table shows IDs until name join enrichment
- No producer/order/pallet detail tabs beyond overview wine rollup in v1 UI (engine supports extension)

## Future accounting integration

Connect statutory ledger / Fortnox / bank feeds under a separate “bookkeeping” lane — keep management economics distinct.
