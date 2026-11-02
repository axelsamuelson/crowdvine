-- Fix wrong-language locale parts and nested/stringified JSON in localized wine/producer fields.
-- Idempotent: each UPDATE matches id + known before-value(s). Safe if PR #158 (sulfite phrasing)
-- lands first — WHERE also accepts that PR's post-state where it overlaps these rows.
-- Does NOT apply itself to production on merge; run via normal migration process.

-- ---------------------------------------------------------------------------
-- 1) wines.additives — Claparedes (Mas Des Mesures)
--    Before: Swedish in both en and sv ("Inga tillsatser, inga sulfiter")
--    After:  en English, sv Swedish; "no added" / "inga tillsatta"
--    PR #158 overlap: would leave Swedish in en (only sulfite phrasing change)
-- ---------------------------------------------------------------------------
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '2515ad2c-a947-4704-a132-6822d8b98abb'
  AND (
    additives = $j${"en": "Inga tillsatser, inga sulfiter", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb
    OR additives = $j${"en": "Inga tillsatser, inga tillsatta sulfiter", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
  );

-- ---------------------------------------------------------------------------
-- 2) wines.additives — Septentrion (Mas Des Mesures)
--    Same pattern as Claparedes. PR #158 overlap as above.
-- ---------------------------------------------------------------------------
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '9301970e-5f34-473b-b891-5c5910ba8783'
  AND (
    additives = $j${"en": "Inga tillsatser, inga sulfiter", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb
    OR additives = $j${"en": "Inga tillsatser, inga tillsatta sulfiter", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
  );

-- ---------------------------------------------------------------------------
-- 3) wines.description — Maelström (Pierre et l'Étoile)
--    Before: English prose stored under sv only; absolute "No sulfites"
--    After:  en = English (no added), sv = Swedish translation
--    PR #158 overlap: keeps English under sv, only changes sulfite phrasing
-- ---------------------------------------------------------------------------
UPDATE wines
SET description = $j${"en": "Another Carignan, but a different animal. Pierre Regnault uses 65-year-old vines, five days of whole-cluster maceration, and lets the wine age on its lees before bottling by gravity in April 2023. No added sulphites, no fining, no filtration. The kind of wine where every decision in the cellar is about getting out of the way.", "sv": "Ännu en Carignan, men av ett helt annat slag. Pierre Regnault använder 65 år gamla stockar och fem dagars maceration med hela klasar. Vinet får ligga på jästfällningen innan det buteljeras med självfall i april 2023. Inga tillsatta sulfiter, ingen klarning, ingen filtrering. Ett vin där varje beslut i källaren handlar om att hålla sig ur vägen."}$j$::jsonb
WHERE id = 'c1902533-25b4-42aa-95f0-636511b24845'
  AND (
    description = $j${"sv": "Another Carignan, but a different animal. Pierre Regnault uses 65-year-old vines, five days of whole-cluster maceration, and lets the wine age on its lees before bottling by gravity in April 2023. No sulfites, no fining, no filtration. The kind of wine where every decision in the cellar is about getting out of the way."}$j$::jsonb
    OR description = $j${"sv": "Another Carignan, but a different animal. Pierre Regnault uses 65-year-old vines, five days of whole-cluster maceration, and lets the wine age on its lees before bottling by gravity in April 2023. No added sulfites, no fining, no filtration. The kind of wine where every decision in the cellar is about getting out of the way."}$j$::jsonb
  );

-- ---------------------------------------------------------------------------
-- 4) producers.short_description — Prieuré St Jean de Bébian
--    Before: Swedish text in both en and sv; absolute "utan svavel"
--    After:  en English, sv Swedish; "without added sulphur" / "utan tillsatt svavel"
--    No PR #158 overlap.
-- ---------------------------------------------------------------------------
UPDATE producers
SET short_description = $j${"en": "Under Benoît Pontenier, Bébian has been revitalised through biodynamic farming and minimal-intervention winemaking without added sulphur. Parcel selection and ageing in foudre.", "sv": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan tillsatt svavel. Parcellurval och lagring i foudre."}$j$::jsonb
WHERE id = '910d2f17-3eb1-4a84-8645-b09004a952ea'
  AND short_description = $j${"en": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan svavel. Parcellurval och lagring i foudre.", "sv": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan svavel. Parcellurval och lagring i foudre."}$j$::jsonb;

-- ---------------------------------------------------------------------------
-- 5) wines.additives — Scamu (Domaine de la Cessière)
--    Note: wines have no short_description column; wrong-language locale is on additives.
--    Before: Swedish "Inga sulfiter tillagda" in both en and sv
--    After:  {"en":"No added sulphites","sv":"Inga tillsatta sulfiter"}
--    No PR #158 overlap.
-- ---------------------------------------------------------------------------
UPDATE wines
SET additives = $j${"en": "No added sulphites", "sv": "Inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '69010575-529e-4b12-9f5c-d9e78a2dfcac'
  AND additives = $j${"en": "Inga sulfiter tillagda", "sv": "Inga sulfiter tillagda"}$j$::jsonb;

-- ---------------------------------------------------------------------------
-- 6–10) wines.additives — nested/stringified JSON → flat {en, sv} strings
--    Same structure as sibling rows (e.g. Hors Saison Brin de Paille, La Marotte La Plage).
--    PR #158 overlap: preserves nesting and only rewrites sulfite phrasing — WHERE
--    accepts both current nested "no sulphites" and PR #158 nested "no added" forms.
-- ---------------------------------------------------------------------------

-- Hors Saison | Le Nouveau Western
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '0c25db9f-2722-4fcc-aae6-61b873b109ac'
  AND (
    additives = $j${"en": "No additives, no sulphites", "sv": {"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}}$j$::jsonb
    OR additives = $j${"en": "No additives, no added sulphites", "sv": {"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}}$j$::jsonb
  );

-- Hors Saison | Été Indien
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '43a22c65-40d7-4d82-912d-21a3133b5bf4'
  AND (
    additives = $j${"en": "No additives, no sulphites", "sv": {"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}}$j$::jsonb
    OR additives = $j${"en": "No additives, no added sulphites", "sv": {"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}}$j$::jsonb
  );

-- La Marotte | Debout
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb
WHERE id = 'a38a5297-7e1e-4a9d-875c-b464860feaaf'
  AND (
    additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
    OR additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
  );

-- La Marotte | Micocoulier
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb
WHERE id = '22da5d35-a253-40e8-a870-82dd3230601a'
  AND (
    additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
    OR additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
  );

-- La Marotte | Résiste
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb
WHERE id = '8f142080-120b-419b-b213-32477b43f1af'
  AND (
    additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
    OR additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
  );
