# WINE_BOX_6 + Instabee outbound configuration audit

Date: 2026-08-15  
Parent: Phase 2C (`bcad930a`) + status/CI baseline (`26b1233f`)

## Result of this phase

**BLOCKED** for production packaging mutation: no authoritative outer dimensions or tare weight for `WINE_BOX_6` found in repo, docs, PDFs, supplier sheets, or production DB.

Code/docs/tests hardened so incomplete pricing stays explicit and fail-safe.

## Packaging profile

| Field | Production value | Confidence |
|-------|------------------|------------|
| code | `WINE_BOX_6` | VERIFIED |
| max_bottles | 6 | VERIFIED (seed) |
| min_bottles | 1 | VERIFIED |
| length_m / width_m / height_m | **NULL** | UNKNOWN — not inventable |
| tare_weight_kg | **NULL** | UNKNOWN — not inventable |
| supplier / SKU | — | UNKNOWN |

### What is needed from ops

1. Outer carton L × W × H (shipping exterior, not internal cells)
2. Empty carton tare kg (state whether dividers/inserts included)
3. Supplier product sheet / invoice / measured PACT record with date
4. Confirmation this is the carton used for Instabee Home parcels

## Instabee Home Delivery evidence

| Field | Configured | Confidence | Notes |
|-------|------------|------------|-------|
| Base 79 SEK | yes | VERIFIED | Home offer terms |
| First 0.5 kg included | yes | VERIFIED | |
| +1 SEK / 0.5 kg | yes | VERIFIED | |
| Volumetric factor 280 | yes | **ASSUMPTION** | Appeared under **Locker deliveries** in source PDF |
| Max weight 20 kg | not enforced in economics | UNKNOWN for Home | Locker-associated in source |
| Locker dimensions | not applied | — | Must **not** bind to Home |
| Fuel included | yes | VERIFIED | |
| Remote area SE | blocked | VERIFIED | Norway footnote |
| valid_to 2026-08-18 | yes | VERIFIED | Inclusive (`asOf > valid_to` expires) |
| Tax / VAT basis | — | **UNKNOWN** | Not established from source |

## Locker vs Home

Locker-only / locker-section material must not be applied as verified Home rules:

- Volumetric factor 280 (kept only as configurable assumption)
- Locker max package dimensions
- Locker-specific products

## Calculation (current code)

1. `parcelCount = ceil(bottles / max_bottles)` — **ASSUMPTION** for multi-box ops
2. Volumetric kg = L×W×H (meters) × factor (default 280)
3. Round **up** to 0.5 kg
4. Chargeable = volumetric only (`pricing_basis=VOLUMETRIC_WEIGHT`); actual bottle weight not used; tare unused
5. Price = 79 SEK first 0.5 kg + 1 SEK per extra 0.5 kg × parcel count
6. Missing dims / expired rate → `INCOMPLETE`, totals `null` (never 0 SEK invent)

## Incomplete reason codes

`MISSING_PACKAGING_DIMENSIONS`, `MISSING_PRODUCT_WEIGHT`, `MISSING_VOLUMETRIC_WEIGHT`, `RATE_EXPIRED`, `NO_ACTIVE_RATE`, `DESTINATION_NOT_COVERED`, `NO_BOTTLES`, `PARCEL_COUNT_UNRESOLVED`, `UNKNOWN_PRICING_BASIS`, `BOTH_WEIGHTS_REQUIRED`

## Rate validity

- `2026-08-18` still usable
- `2026-08-19+` → no live rate / expired → incomplete new quotes
- Historical frozen quotes unchanged

## Frozen quotes

- Snapshot includes rate card + breakdown; schema_version 2 also freezes packaging L/W/H/tare when present (nulls today)
- Changing future packaging/rate does not rewrite historical rows

## Production configuration mutation

**None** for packaging dimensions/tare.  
Migration `198_outbound_instabee_provenance_notes.sql` only updates **notes** text on placeholder profile + Instabee rate.

## Remaining blockers

1. Authoritative WINE_BOX_6 outer dims + tare
2. Verified Home Delivery volumetric factor (or confirm 280)
3. Tax/VAT basis for 79 SEK
4. Replacement rate after 2026-08-18
5. Product gross bottle weights if switching to actual / max(actual, vol)

## Non-goals preserved

- 120 / 720 readiness unchanged
- Shadow economics only
- No Instabee shipment booking
- No order/reservation/payment mutations
