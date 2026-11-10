-- Documentation for PACT B2C whole-kronor consumer prices. Axel approved applying on 2026-11-10 (test first, then prod by Hugo).
--
-- Product decision: displayed B2C unit price incl. VAT is binding in whole kronor.
-- Formula change lives in lib/wine-retail-pricing.ts (and lib/pricing B2C_RETAIL_TODAY
-- rounding = round_sek). Dirty Wine / B2B paths are unchanged.
--
-- Persisted columns that must be recalculated before production cuts over:
--   wines.base_price_cents
--   wines.calculated_price_cents
-- Prefer the existing scripts/recalculate-wine-prices.ts (or admin save path via
-- applyCostBasedRetailPricing) rather than a one-shot SQL UPDATE of every row.
--
-- Apply only after the approved recalculation plan and backup (Hugo on prod after test).
--
-- This migration intentionally contains no DDL/DML.

SELECT 1;
