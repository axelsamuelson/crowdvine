# Pallet status integrity follow-up

Date: 2026-08-15  
Related: Phase 2D readiness hardening (`0212de63`) + this follow-up.

## Bugs fixed

### 1. Dual auto-status writers disagreed
- `syncPalletShipReadiness` / `decidePalletShipReadinessSync` used canonical pallet fill (`sumReservedBottlesOnPallet`) for `open` vs `consolidating`.
- `recomputeAutoPalletStatus` (admin PUT when `status_mode=auto`) inferred activity via **zone-mapped** reservations (producer `pickup_zone_id` must match pallet).
- Production pallet `3985cbfe-…` had fill **30** but all producers had `pickup_zone_id = null` → mapped count **0** → recompute returned **`open`**.

### 2. Silent-zero fill aggregation
- `sumReservedBottlesOnPallet` returned `0` on reservation/item query errors.
- Mutation paths could treat UNKNOWN as EMPTY → revert readiness, set `status=open`, clear completion fields.

## Canonical rule (pre-shipping, auto)

Shared helper: `derivePreShippingAutoStatus` in `lib/pallet-ship-progress.ts`

| Counted bottles | Status |
|-----------------|--------|
| 0 | `open` |
| 1 … min-1 | `consolidating` |
| ≥ min (default 120) | `complete` (via readiness sync / `completePallet`) |

Zone / producer metadata must **not** decide empty vs active.

## Error handling

- `sumReservedBottlesOnPalletResult` → `{ ok: true, bottles }` or `{ ok: false, error }`
- `sumReservedBottlesOnPallet` throws on failure (never silent 0)
- `syncPalletShipReadiness` uses Result; on failure → **no mutation**
- `decidePalletShipReadinessSync` supports `fillUnavailable` → `action: "unavailable"`
- Align-only action `align_status` repairs `open`↔`consolidating` when readiness already correct

## Manual / locked

- Manual mode: readiness may revert; operational status not overwritten
- Locked statuses (`PALLET_SHIPPING_LOCKED_STATUSES`) unchanged

## Tests

See `lib/__tests__/pallet-status-integrity.test.ts` and updates in `pallet-readiness-integrity.test.ts`.

## Remaining assumptions

- Assignment pool still `open | consolidating | complete`
- Public readiness still fill/threshold based (not operational status)
- One-row production status reconcile may still be needed for rows written before deploy
