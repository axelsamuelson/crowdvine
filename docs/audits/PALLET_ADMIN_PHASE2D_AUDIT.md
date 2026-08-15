# PACT admin pallet UX — Phase 2D audit

Date: 2026-08-15  
Basis: production code at Phase 2C commit `bcad930a` + Phase 2D implementation (this tree).  
Final verification: 2026-08-15 (read-only DB checks; no production mutations).

---

## Current PACT list architecture (post-2D)

- Page: `app/admin/pallets/page.tsx` (`tab=pact`)
- Card: `components/admin/pact-pallet-list-card.tsx` (B2B anatomy: light/dark, footer actions)
- API: `GET /api/admin/pallets` — **`requireAdmin()`** then service role; attaches `operating_summary`
- Primary readiness: `bottlesFilled / minBottlesToShip` (e.g. `30 / 120 to ship`)
- Physical: `bottlesFilled / physicalBottleCapacity` secondary
- Shadow freight funded % marked informational / Shadow
- Actions: **Status** → `/admin/pallets/{id}`; **Redigera** → `/admin/pallets/{id}/edit`; Delete unchanged
- Order Shipping **removed from list** (detail only)
- KPI strip removed

## Current B2B list architecture (reference)

- Same page `tab=b2b` — visual reference only (not data semantics)
- Card: `bg-white dark:bg-[#0F0F12] rounded-xl border… overflow-hidden`
- Footer: Status / Redigera / Delete

## Current PACT detail architecture (post-2D)

- Route: `/admin/pallets/[id]` → `AdminPalletDetails`
- Canonical metrics: `GET /api/admin/pallets/{id}/operating-summary` → `AdminPalletOperatingSummary`
- Summary UI: `AdminPactPalletStatusSummary`
- Section order:
  1. Attention / warnings  
  2. Inbound logistics (`PalletInboundFreightPanel`)  
  3. Reservations (display only — not fill source)  
  4. Wine allocation (`% of physical pallet`)  
  5. Outbound economics  
  6. Operational status  
  7. Advanced / legacy (collapsed: `cost_cents`, last-mile, completion rules)

## Bottle aggregation sources

| Surface | Source |
|---------|--------|
| List | `buildAdminPalletOperatingSummaries` → `PALLET_FILL_STATUSES` + item quantities |
| Detail readiness | same via `buildAdminPalletOperatingSummaryForId` |
| Reservation table | display only |
| Live readiness write | `syncPalletShipReadiness` + `min_bottles_to_complete` |

**No dual definitions** for admin operating metrics.

## Readiness / physical / shadow semantics

- Live: `min_bottles_to_complete` (120) → `isReadyToShip` / `syncPalletShipReadiness`
- Physical: `bottle_capacity` (720)
- Shadow: contribution vs freight target — **informational only**
- Freight target precedence (unchanged Phase 2B):
  1. manual `freight_target_cents`
  2. selected economically usable inbound quote SEK
  3. legacy `cost_cents`

## Completion rules

- Still stored / editable under Advanced / Legacy
- Evaluated in `pallet-data` and auto `recomputeAutoPalletStatus`
- **`syncPalletShipReadiness` does NOT use completion_rules**
- UI copy states live readiness is `min_bottles_to_complete`

## Status model

- **Readiness:** Ready to ship / Not ready (`operating_summary.isReadyToShip`)
- **Operational:** `pallet.status` (open, consolidating, shipping_ordered, …)
- `status=complete` labelled as legacy-compatible operational label, not conflated with live readiness

## Admin security (final)

All `app/api/admin/pallets/**` routes that use `getSupabaseAdmin()` now call **`requireAdmin()`** first:

| Route | Auth |
|-------|------|
| `GET/POST /api/admin/pallets` | `requireAdmin()` |
| `GET/PUT/DELETE /api/admin/pallets/[id]` | `requireAdmin()` |
| `GET …/operating-summary` | `requireAdmin()` |
| reservations GET / DELETE / reset | `requireAdmin()` |
| order-shipping / revert-shipping | `requireAdmin()` |
| check-completion / network-data | `requireAdmin()` |
| freight-quotes / trigger-notifications | `requireAdmin()` |
| `/api/admin/freight/catalogue` + `/outbound` | `requireAdmin()` (unchanged) |

Cookie-only `admin-auth=true` checks on pallet routes were **removed** in final verification.

## Actual changes made

1. `lib/admin-pallet-operating-summary.ts` — shared serializer  
2. List redesign via `PactPalletListCard`  
3. Detail redesign + `AdminPactPalletStatusSummary`  
4. Operating-summary API + list enrichment  
5. Auth hardening across pallet admin APIs  
6. Tests: `lib/__tests__/admin-pallet-operating-summary.test.ts`  
7. `getPallet` embeds shipping_region + pickup producer  

## Legacy fields retained

- `cost_cents` — Advanced only, labelled legacy fallback  
- `last_mile_cost_cents_per_bottle` — Advanced only  
- `completion_rules` — Advanced only (backend kept)  

## Explicit non-goals (unchanged)

- Do not activate economic readiness  
- Do not change 120 / 720 defaults  
- Do not change customer PDP/checkout  
- Do not delete completion_rules  
- Do not invent outbound dimensions  
- Do not copy B2B data semantics onto PACT  

---

## Verification results (2026-08-15)

### Canonical metrics consistency

List and detail share `AdminPalletOperatingSummary` builders. Detail does not use reservation-array sum for header/summary readiness.

### Regression cases (unit)

- 30 / 120 → 25%, 90 remaining, NOT ready; physical 690 remaining, ~4.2% util (one-decimal)  
- 119 + funded shadow → live NOT ready  
- 120 + underfunded shadow → live READY  
- Freight target precedence unit-tested  
- Outbound incomplete packaging warns; never “0 SEK”  

### Production read-only check — pallet `3985cbfe-178f-4fa1-a897-17183a1f18db`

- Name: Middle Languedoc to Stockholm  
- Fill-eligible bottles: **30** (6 reservations; 5 fill-eligible; 1 cancelled)  
- `min_bottles_to_complete=120`, `bottle_capacity=720`  
- `selected_inbound_freight_quote_id=null` → freight target falls back to legacy `cost_cents=600000`  
- `WINE_BOX_6`: `length_m/width_m/height_m/tare_weight_kg` all **null** → outbound incomplete  
- DB `is_complete=true` while fill=30 — **stale DB flag**; admin UI uses computed `isReadyToShip` (false). Follow-up: run `syncPalletShipReadiness` for this pallet (not done in 2D; no mutation).  

### 30-bottle / zone-status discrepancy

Admin canonical aggregation for this pallet is **30**, not 0.  
Earlier public `zone-status` showing 0 is **not** explained by a shared fill helper bug on this pallet ID. Likely market-drop / different active pallet selection for the Hippie Killer PDP context. **Follow-up only** — no speculative public-route change in Phase 2D.

### Tests

```text
npm test -- lib/__tests__/admin-pallet-operating-summary.test.ts \
  lib/__tests__/pallet-ship-progress.test.ts \
  lib/__tests__/pallet-contribution.test.ts \
  lib/__tests__/freight-pricing.test.ts \
  lib/__tests__/outbound-freight-pricing.test.ts
→ 5 files, 70 passed
```

Full suite: `209` tests, **208 passed**, **1 failed** — `lib/external-prices/__tests__/normalize.test.ts` (vintage strip expectation). Pre-existing; **not** in Phase 2D diff. After Phase 2C the relevant pallet/freight suite was ~65; Phase 2D adds 5 helper tests → **70** in the scoped suite.

### Build

`npm run build` — **success**

### Security blockers

None remaining under `app/api/admin/pallets/**`.

### Unresolved / follow-ups

1. Stale `pallets.is_complete=true` on 30-bottle pallet `3985cbfe-…` — **code hardened** (see readiness-integrity commit). Do **not** mutate production in-repo; after deploy use explicit `POST /api/admin/pallets/check-completion` or `syncPalletShipReadiness`.  
2. Public zone-status 0 vs admin 30 — market-drop resolution (**separate follow-up; not investigated here**)  
3. Configure `WINE_BOX_6` dimensions (ops, not code)  
4. Select inbound Hillebrand quote for this pallet when ready  
5. Optional: fix unrelated `normalizePdpTitle` test drift  
