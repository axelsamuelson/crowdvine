-- Fix producers.short_description.en for Prieuré St Jean de Bébian.
-- Migration 266 missed this row: 265 had already rewritten "utan svavel" →
-- "utan tillsatt svavel", so 266's WHERE on the pre-265 value did not match.
-- Idempotent: UPDATE by id + current prod value. Does not apply on merge alone.

UPDATE producers
SET short_description = $j${"en": "Under Benoît Pontenier, Bébian has been revitalised through biodynamic farming and minimal-intervention winemaking without added sulphur. Parcel selection and ageing in foudre.", "sv": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan tillsatt svavel. Parcellurval och lagring i foudre."}$j$::jsonb
WHERE id = '910d2f17-3eb1-4a84-8645-b09004a952ea'
  AND short_description = $j${"en": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan tillsatt svavel. Parcellurval och lagring i foudre.", "sv": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan tillsatt svavel. Parcellurval och lagring i foudre."}$j$::jsonb;
