-- Follow-up: missed absolute sulfite/sulphur claims (ageing + producers).
-- Idempotent targeted UPDATEs by id (WHERE col = before).
-- Does not touch Courtiol ageing (already has sulphite addition / sulfitillägg).
-- Courtiol summary sv phrasing adjusted in 264 (utan tillsatta sulfiter, filtrering eller klarning).

-- wines.ageing | Hors Saison | Dans les bois | 6f962b59-e082-4986-9d00-58466d72e7a5
UPDATE wines
SET ageing = $j${"en": "Direct-press Chardonnay, fermented with native yeasts. Aged 15 months, of which 9 months in a Meursault Burgundy barrel (older wood that does not impart dominant oak character). Remaining time in fiberglass vat. Bottled without added sulphites.", "sv": "Direktpressad Chardonnay, fermenterad med indigena jästsvampar. Elevage 15 månader varav 9 månader i bourgognefat från Meursault, resterande i fiberkar. Buteljeras utan tillsatta sulfiter."}$j$::jsonb
WHERE id = '6f962b59-e082-4986-9d00-58466d72e7a5'
  AND ageing = $j${"en": "Direct-press Chardonnay, fermented with native yeasts. Aged 15 months, of which 9 months in a Meursault Burgundy barrel (older wood that does not impart dominant oak character). Remaining time in fiberglass vat. Bottled without sulphites.", "sv": "Direktpressad Chardonnay, fermenterad med indigena jästsvampar. Elevage 15 månader varav 9 månader i bourgognefat från Meursault, resterande i fiberkar. Buteljeras utan sulfiter."}$j$::jsonb;

-- wines.ageing | Meigoon | Extralucide | 1fc52e4d-a4b9-4c99-b00f-9f5678cd2f61
UPDATE wines
SET ageing = $j${"en": "Cinsault and Aramon, hand-harvested from schist. Maceration and spontaneous fermentation with indigenous yeasts in fibreglass tank. No filtration, no fining, no added sulphites.", "sv": "Cinsault och Aramon, handskördat på skiffer. Maceration och spontanfermentation med indigena jästsvampar i glasfibertank. Ingen filtrering, ingen fining, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = '1fc52e4d-a4b9-4c99-b00f-9f5678cd2f61'
  AND ageing = $j${"en": "Cinsault and Aramon, hand-harvested from schist. Maceration and spontaneous fermentation with indigenous yeasts in fibreglass tank. No filtration, no fining, no sulphites.", "sv": "Cinsault och Aramon, handskördat på skiffer. Maceration och spontanfermentation med indigena jästsvampar i glasfibertank. Ingen filtrering, ingen fining, inga sulfiter."}$j$::jsonb;

-- wines.ageing | Meigoon | Flore Et Sens | 5dc37adf-91e9-4c22-b2a3-3e3ad371941f
UPDATE wines
SET ageing = $j${"en": "Direct-press Grenache Blanc and Viognier, fermented with native yeasts in fiberglass tanks. No wood ageing. No fining, no filtration, no added sulphites.", "sv": "Direktpressad Grenache Blanc och Viognier, fermenterad med indigena jästsvampar i glasfibertank. Ingen trälagring. Ingen filtrering, ingen fining, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = '5dc37adf-91e9-4c22-b2a3-3e3ad371941f'
  AND ageing = $j${"en": "Direct-press Grenache Blanc and Viognier, fermented with native yeasts in fiberglass tanks. No wood ageing. No fining, no filtration, no sulphites.", "sv": "Direktpressad Grenache Blanc och Viognier, fermenterad med indigena jästsvampar i glasfibertank. Ingen trälagring. Ingen filtrering, ingen fining, inga sulfiter."}$j$::jsonb;

-- wines.ageing | Meigoon | Jardin d'Ivresse | c6811980-c1a7-4f9a-be12-32de6b7ce311
UPDATE wines
SET ageing = $j${"en": "100% Carignan, hand-harvested on schist. Maceration and spontaneous fermentation with native yeasts. Fiberglass tanks. No fining, no filtration, no added sulphites.", "sv": "100% Carignan, handskördat på skiffer. Maceration och spontanfermentasion med indigena jästsvampar. Glasfibertank. Ingen filtrering, ingen fining, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = 'c6811980-c1a7-4f9a-be12-32de6b7ce311'
  AND ageing = $j${"en": "100% Carignan, hand-harvested on schist. Maceration and spontaneous fermentation with native yeasts. Fiberglass tanks. No fining, no filtration, no sulphites.", "sv": "100% Carignan, handskördat på skiffer. Maceration och spontanfermentasion med indigena jästsvampar. Glasfibertank. Ingen filtrering, ingen fining, inga sulfiter."}$j$::jsonb;

-- wines.ageing | La Revolte | L’Oeil du Lézard | 8672f330-b6b3-4e91-a1a1-1f74f475e85b
UPDATE wines
SET ageing = $j${"en": "Carignan, Grenache and Syrah, maceration and spontaneous fermentation. Aged in fiberglass or concrete. No added sulphites, no filtration.", "sv": "Carignan, Grenache och Syrah, maceration och spontanfermentasion. Elevage i fiberkar eller betong. Inga tillsatta sulfiter, ingen filtrering."}$j$::jsonb
WHERE id = '8672f330-b6b3-4e91-a1a1-1f74f475e85b'
  AND ageing = $j${"en": "Carignan, Grenache and Syrah, maceration and spontaneous fermentation. Aged in fiberglass or concrete. No sulphites, no filtration.", "sv": "Carignan, Grenache och Syrah, maceration och spontanfermentasion. Elevage i fiberkar eller betong. Inga sulfiter, ingen filtrering."}$j$::jsonb;

-- wines.ageing | La Revolte | La Rêvolte Rouge | b600c59f-fa87-40e4-a85a-24e8da1edec9
UPDATE wines
SET ageing = $j${"en": "Cinsault and Carignan, naturally vinified without additives. Short maceration, spontaneous fermentation with native yeasts. Fiberglass or concrete. No added sulphites.", "sv": "Cinsault och Carignan, naturvinifierat utan tillsatser. Kort maceration, spontanfermentasion med indigena jästsvampar. Fiberkar eller betong. Inga tillsatta sulfiter."}$j$::jsonb
WHERE id = 'b600c59f-fa87-40e4-a85a-24e8da1edec9'
  AND ageing = $j${"en": "Cinsault and Carignan, naturally vinified without additives. Short maceration, spontaneous fermentation with native yeasts. Fiberglass or concrete. No sulphites.", "sv": "Cinsault och Carignan, naturvinifierat utan tillsatser. Kort maceration, spontanfermentasion med indigena jästsvampar. Fiberkar eller betong. Inga sulfiter."}$j$::jsonb;

-- wines.ageing | La Revolte | Le Fils du Lézard | 01eefa70-78e1-4585-9f44-91e52de0b7be
UPDATE wines
SET ageing = $j${"en": "Direct-press Vermentino, Clairette and Terret Bourret, fermented with native yeasts in fiberglass. No added sulphites, no filtration.", "sv": "Direktpressad Vermentino, Clairette och Terret Bourret, fermenterad med indigena jästsvampar. Fiberkar. Inga tillsatta sulfiter, ingen filtrering."}$j$::jsonb
WHERE id = '01eefa70-78e1-4585-9f44-91e52de0b7be'
  AND ageing = $j${"en": "Direct-press Vermentino, Clairette and Terret Bourret, fermented with native yeasts in fiberglass. No sulphites, no filtration.", "sv": "Direktpressad Vermentino, Clairette och Terret Bourret, fermenterad med indigena jästsvampar. Fiberkar. Inga sulfiter, ingen filtrering."}$j$::jsonb;

-- wines.ageing | Pierre et l'Étoile | Maelström | c1902533-25b4-42aa-95f0-636511b24845
UPDATE wines
SET ageing = $j${"en": "100% Carignan, 5-day whole-cluster maceration. Aged on lees before bottling by gravity in April. No added sulphites, no fining, no filtration.", "sv": "100% Carignan, 5 dagars helhels-maceration (hela druvklasar). Lagras på lees innan buteljering med tyngdkraft i april. Inga tillsatta sulfiter, ingen fining, ingen filtrering."}$j$::jsonb
WHERE id = 'c1902533-25b4-42aa-95f0-636511b24845'
  AND ageing = $j${"en": "100% Carignan, 5-day whole-cluster maceration. Aged on lees before bottling by gravity in April. No sulphites, no fining, no filtration.", "sv": "100% Carignan, 5 dagars helhels-maceration (hela druvklasar). Lagras på lees innan buteljering med tyngdkraft i april. Inga sulfiter, ingen fining, ingen filtrering."}$j$::jsonb;

-- wines.ageing | Peira Levada | Otium | b80544b6-1790-473c-bb93-b98874cab410
UPDATE wines
SET ageing = $j${"en": "Blend of all the estate's varieties — Carignan, Cinsault, Grenache and Syrah. Aged in vats. Spontaneous fermentation with native yeasts. No added sulphites.", "sv": "Assemblage av alla domänets druvsort — Carignan, Cinsault, Grenache och Syrah. Elevage i kar. Spontanfermentasion med indigena jästsvampar. Inga tillsatta sulfiter."}$j$::jsonb
WHERE id = 'b80544b6-1790-473c-bb93-b98874cab410'
  AND ageing = $j${"en": "Blend of all the estate's varieties — Carignan, Cinsault, Grenache and Syrah. Aged in vats. Spontaneous fermentation with native yeasts. No sulphites.", "sv": "Assemblage av alla domänets druvsort — Carignan, Cinsault, Grenache och Syrah. Elevage i kar. Spontanfermentasion med indigena jästsvampar. Inga sulfiter."}$j$::jsonb;

-- wines.ageing | Meigoon | Ultravision | dde4e61c-ef3a-461b-beca-0eb8f5d60cd3
UPDATE wines
SET ageing = $j${"en": "Carignan and Grenache, hand-harvested on schist. Short maceration and spontaneous fermentation with native yeasts. Fiberglass tanks. No fining, no filtration, no added sulphites.", "sv": "Carignan och Grenache, handskördat på skiffer. Kort maceration och spontanfermentasion med indigena jästsvampar. Glasfibertank. Ingen filtrering, ingen fining, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = 'dde4e61c-ef3a-461b-beca-0eb8f5d60cd3'
  AND ageing = $j${"en": "Carignan and Grenache, hand-harvested on schist. Short maceration and spontaneous fermentation with native yeasts. Fiberglass tanks. No fining, no filtration, no sulphites.", "sv": "Carignan och Grenache, handskördat på skiffer. Kort maceration och spontanfermentasion med indigena jästsvampar. Glasfibertank. Ingen filtrering, ingen fining, inga sulfiter."}$j$::jsonb;

-- wines.ageing | Gregory White | White is Blanc | 394dc83c-d584-408f-8cd7-aac810a8450c
UPDATE wines
SET ageing = $j${"en": "Terret Bourret and Grenache Blanc, fermented with native yeasts in stainless steel. Tasted daily during fermentation. No filtration, no fining, no added sulphites.", "sv": "Terret Bourret och Grenache Blanc, fermenterat med naturliga jästsvampar i ståltank. Daglig provning under fermentasion. Ingen filtrering, ingen fining, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = '394dc83c-d584-408f-8cd7-aac810a8450c'
  AND ageing = $j${"en": "Terret Bourret and Grenache Blanc, fermented with native yeasts in stainless steel. Tasted daily during fermentation. No filtration, no fining, no sulphites.", "sv": "Terret Bourret och Grenache Blanc, fermenterat med naturliga jästsvampar i ståltank. Daglig provning under fermentasion. Ingen filtrering, ingen fining, inga sulfiter."}$j$::jsonb;

-- wines.ageing | Gregory White | White is Rouge | 6ab40feb-a6fc-47e1-b4c5-77958b368e55
UPDATE wines
SET ageing = $j${"en": "Carignan and Cinsault, 2 weeks fermentation with daily pump-over for gentle extraction. Native yeasts in stainless steel. No filtration, no fining, no added sulphites.", "sv": "Carignan och Cinsault, 2 veckors fermentasion med daglig pompage för varsam extraktion. Naturliga jästsvampar i ståltank. Ingen filtrering, ingen fining, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = '6ab40feb-a6fc-47e1-b4c5-77958b368e55'
  AND ageing = $j${"en": "Carignan and Cinsault, 2 weeks fermentation with daily pump-over for gentle extraction. Native yeasts in stainless steel. No filtration, no fining, no sulphites.", "sv": "Carignan och Cinsault, 2 veckors fermentasion med daglig pompage för varsam extraktion. Naturliga jästsvampar i ståltank. Ingen filtrering, ingen fining, inga sulfiter."}$j$::jsonb;

-- wines.ageing | Pierre et l'Étoile | Zeph | d3ea35a2-5f25-4cb3-9265-323b98bbdacb
UPDATE wines
SET ageing = $j${"en": "Carignan and Syrah, early harvest for low alcohol (11%). Maceration and spontaneous fermentation with native yeasts. Fiberglass vats. No additives, no added sulphites, no filtration.", "sv": "Carignan och Syrah, tidig skörd för låg alkohol (11%). Maceration och spontanfermentasion med indigena jästsvampar. Fiberkar. Inga tillsatser, inga tillsatta sulfiter, ingen filtrering."}$j$::jsonb
WHERE id = 'd3ea35a2-5f25-4cb3-9265-323b98bbdacb'
  AND ageing = $j${"en": "Carignan and Syrah, early harvest for low alcohol (11%). Maceration and spontaneous fermentation with native yeasts. Fiberglass vats. No additives, no sulphites, no filtration.", "sv": "Carignan och Syrah, tidig skörd för låg alkohol (11%). Maceration och spontanfermentasion med indigena jästsvampar. Fiberkar. Inga tillsatser, inga sulfiter, ingen filtrering."}$j$::jsonb;

-- producers.bio_long | Mas Pas-Res |  | 8ce78db7-5ab5-4716-bf9a-7f91f88fa7b1
UPDATE producers
SET bio_long = $j${"en": "Mas Pas-Res is the project of Julien Trichard and Sara Hernandez in Vendémian, Hérault, working out of a repurposed cooperative cellar. They farm eleven hectares organically, split between the garrigue-covered hills around Gignac and the clay-limestone soils of Plaissan. Vineyard work is built on low yields, hand harvesting, mature vines and minimal soil disturbance, with Kiwi the workhorse in the parcels. The cellar follows a strict no-input approach — spontaneous fermentation on native flora and ageing in neutral vessels, with no additives, no filtration and no added sulphur.", "sv": "Mas Pas-Res är Julien Trichards och Sara Hernandez projekt i Vendémian i Hérault, med källare i ett ombyggt vinkooperativ. De brukar elva hektar ekologiskt, delade mellan de garriguetäckta kullarna kring Gignac och lerkalkjordarna i Plaissan. Arbetssättet bygger på låga avkastningar, handskörd, gamla stockar och minimal jordbearbetning, med arbetshästen Kiwi i parcellerna. I källaren tillämpas en strikt nollinsatslinje — spontanjäsning på egen flora och lagring i neutrala kärl, utan tillsatser, utan filtrering och utan svavel."}$j$::jsonb
WHERE id = '8ce78db7-5ab5-4716-bf9a-7f91f88fa7b1'
  AND bio_long = $j${"en": "Mas Pas-Res is the project of Julien Trichard and Sara Hernandez in Vendémian, Hérault, working out of a repurposed cooperative cellar. They farm eleven hectares organically, split between the garrigue-covered hills around Gignac and the clay-limestone soils of Plaissan. Vineyard work is built on low yields, hand harvesting, mature vines and minimal soil disturbance, with Kiwi the workhorse in the parcels. The cellar follows a strict no-input approach — spontaneous fermentation on native flora and ageing in neutral vessels, with no additives, no filtration and no sulphur.", "sv": "Mas Pas-Res är Julien Trichards och Sara Hernandez projekt i Vendémian i Hérault, med källare i ett ombyggt vinkooperativ. De brukar elva hektar ekologiskt, delade mellan de garriguetäckta kullarna kring Gignac och lerkalkjordarna i Plaissan. Arbetssättet bygger på låga avkastningar, handskörd, gamla stockar och minimal jordbearbetning, med arbetshästen Kiwi i parcellerna. I källaren tillämpas en strikt nollinsatslinje — spontanjäsning på egen flora och lagring i neutrala kärl, utan tillsatser, utan filtrering och utan svavel."}$j$::jsonb;

-- producers.bio_long | Peira Levada |  | 6420c244-0c57-49d5-8ad1-6e7d75960adf
UPDATE producers
SET bio_long = $j${"en": "Pèira Levada is Alexandre Durand's small six-hectare domaine in AOP Faugères, founded in 2018. The vines lie in twelve small parcels set in the woods around the village of Laurens, on schist, marble and granite.\n\nThe vineyard is worked on biodynamic and organic principles. Everything is aimed at keeping the soil alive — only mineral and plant-based preparations to protect it, and animal manure to feed it.\n\nGrapes are hand-picked into crates, destemmed and fermented by gravity on their native flora. No oenological products, no added sulphur.", "sv": "Pèira Levada är Alexandre Durands lilla domän på sex hektar i AOP Faugères, grundad 2018. Vinstockarna ligger i tolv små parceller inbäddade i skogen runt byn Laurens, på skiffer, marmor och granit.\n\nVingården sköts enligt biodynamiska och ekologiska principer. Allt arbete syftar till att hålla jorden vid liv — bara mineraliska och vegetabiliska preparat för att skydda den, och stallgödsel för att föda den.\n\nDruvorna handskördas i lådor, avstjälkas och jäser med gravitation på sin egen flora. Inga oenologiska produkter, inget svavel."}$j$::jsonb
WHERE id = '6420c244-0c57-49d5-8ad1-6e7d75960adf'
  AND bio_long = $j${"en": "Pèira Levada is Alexandre Durand's small six-hectare domaine in AOP Faugères, founded in 2018. The vines lie in twelve small parcels set in the woods around the village of Laurens, on schist, marble and granite.\n\nThe vineyard is worked on biodynamic and organic principles. Everything is aimed at keeping the soil alive — only mineral and plant-based preparations to protect it, and animal manure to feed it.\n\nGrapes are hand-picked into crates, destemmed and fermented by gravity on their native flora. No oenological products, no sulphur.", "sv": "Pèira Levada är Alexandre Durands lilla domän på sex hektar i AOP Faugères, grundad 2018. Vinstockarna ligger i tolv små parceller inbäddade i skogen runt byn Laurens, på skiffer, marmor och granit.\n\nVingården sköts enligt biodynamiska och ekologiska principer. Allt arbete syftar till att hålla jorden vid liv — bara mineraliska och vegetabiliska preparat för att skydda den, och stallgödsel för att föda den.\n\nDruvorna handskördas i lådor, avstjälkas och jäser med gravitation på sin egen flora. Inga oenologiska produkter, inget svavel."}$j$::jsonb;

-- producers.short_description | Prieuré St Jean de Bébian |  | 910d2f17-3eb1-4a84-8645-b09004a952ea
UPDATE producers
SET short_description = $j${"en": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan tillsatt svavel. Parcellurval och lagring i foudre.", "sv": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan tillsatt svavel. Parcellurval och lagring i foudre."}$j$::jsonb
WHERE id = '910d2f17-3eb1-4a84-8645-b09004a952ea'
  AND short_description = $j${"en": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan svavel. Parcellurval och lagring i foudre.", "sv": "Bébian har förnyats under Benoît Pontenier med biodynamik och minimal vinifiering utan svavel. Parcellurval och lagring i foudre."}$j$::jsonb;

