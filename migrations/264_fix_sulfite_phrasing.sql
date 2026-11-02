-- Fix absolute sulfite-free claims → no added / inga tillsatta
-- Targeted UPDATEs by id; idempotent via exact before-value match.
-- Does not change already-correct phrasing (inga tillsatta, no added, tillagda, low/minimal).

-- producers.bio_long | Clos Fantine |  | 30a4559f-0fb3-48f8-9a1c-7215805a1e2d
UPDATE producers
SET bio_long = $j${"en": "Clos Fantine is a family domaine in Cabrerolles, in the heart of the Faugères appellation. Carole, Corine and Olivier Andrieu took over from their father in the mid-1990s and have since farmed it organically, something their father had already begun.\n\nThe domaine covers 25 hectares, mostly planted with Carignan (40%), Grenache (20%), Mourvèdre (20%), Syrah (10%) and Cinsault (10%), all on the schist soils typical of Faugères. Some Carignan plantings are a hundred years old.\n\nThe work is minimally interventionist: no synthetic products, no artificial fertilisers, no filtration, no cooling, no added sulphites. Corine has a background in oenology, Olivier in viticulture and Carole handles the commercial side: a well-worked division of roles in a group of siblings who share a common vision of what Faugères can be.", "sv": "Clos Fantine är ett familjedomän i Cabrerolles i hjärtat av Faugères-appellationen. Carole, Corine och Olivier Andrieu tog över efter sin far i mitten av 1990-talet och har sedan dess drivit det i ekologisk odling — något fadern påbörjat redan innan.\n\nDomänet är 25 hektar, mestadels planterat med Carignan (40%), Grenache (20%), Mourvèdre (20%), Syrah (10%) och Cinsault (10%) — allt på skifferjordar som är typiska för Faugères. Vissa Carignan-planteringar är hundra år gamla.\n\nArbetet är minimalt interventionistiskt: inga syntetiska produkter, inga konstgödsel, inget filtrering, ingen kylning, inga tillsatta sulfiter. Corine har bakgrund inom oenologi, Olivier inom viticultur och Carole sköter den kommersiella sidan — en välarbetad rollfördelning i ett syskonlag som delar en gemensam vision om vad Faugères kan vara."}$j$::jsonb
WHERE id = '30a4559f-0fb3-48f8-9a1c-7215805a1e2d'
  AND bio_long = $j${"en": "Clos Fantine is a family domaine in Cabrerolles, in the heart of the Faugères appellation. Carole, Corine and Olivier Andrieu took over from their father in the mid-1990s and have since farmed it organically, something their father had already begun.\n\nThe domaine covers 25 hectares, mostly planted with Carignan (40%), Grenache (20%), Mourvèdre (20%), Syrah (10%) and Cinsault (10%), all on the schist soils typical of Faugères. Some Carignan plantings are a hundred years old.\n\nThe work is minimally interventionist: no synthetic products, no artificial fertilisers, no filtration, no cooling, no sulphites. Corine has a background in oenology, Olivier in viticulture and Carole handles the commercial side: a well-worked division of roles in a group of siblings who share a common vision of what Faugères can be.", "sv": "Clos Fantine är ett familjedomän i Cabrerolles i hjärtat av Faugères-appellationen. Carole, Corine och Olivier Andrieu tog över efter sin far i mitten av 1990-talet och har sedan dess drivit det i ekologisk odling — något fadern påbörjat redan innan.\n\nDomänet är 25 hektar, mestadels planterat med Carignan (40%), Grenache (20%), Mourvèdre (20%), Syrah (10%) och Cinsault (10%) — allt på skifferjordar som är typiska för Faugères. Vissa Carignan-planteringar är hundra år gamla.\n\nArbetet är minimalt interventionistiskt: inga syntetiska produkter, inga konstgödsel, inget filtrering, ingen kylning, inga sulfiter. Corine har bakgrund inom oenologi, Olivier inom viticultur och Carole sköter den kommersiella sidan — en välarbetad rollfördelning i ett syskonlag som delar en gemensam vision om vad Faugères kan vara."}$j$::jsonb;

-- producers.bio_long | David Behar |  | 5c6d13a7-82aa-4184-969c-6f3275ada1c5
UPDATE producers
SET bio_long = $j${"en": "David Behar is a DJ and musician from Paris who followed his passion for wine and settled in Saint-Chinian. His micro-domaine is built on Syrah and Cinsault — the varieties that dominate the schist terroir of the area.\n\nThe wines are made with minimal intervention: no additives, no added sulphites. Precise and rhythmic winemaking — just like the music. David combines an artistic sensibility with a grounded craft in the vineyard and cellar.", "sv": "David Behar är DJ och musiker från Paris som följde sin passion för vin och slog sig ned i Saint-Chinian. Hans mikrodomän bygger på Syrah och Cinsault — druvsorten som dominerar skifferterroiret i området.\n\nVinerna görs med minimal intervention: inga tillsatser, inga tillsatta sulfiter. Precis och rytmisk vinifiering — precis som musiken. David kombinerar ett konstnärligt förhållningssätt med ett jordnära hantverk i vingård och källare."}$j$::jsonb
WHERE id = '5c6d13a7-82aa-4184-969c-6f3275ada1c5'
  AND bio_long = $j${"en": "David Behar is a DJ and musician from Paris who followed his passion for wine and settled in Saint-Chinian. His micro-domaine is built on Syrah and Cinsault — the varieties that dominate the schist terroir of the area.\n\nThe wines are made with minimal intervention: no additives, no sulphites. Precise and rhythmic winemaking — just like the music. David combines an artistic sensibility with a grounded craft in the vineyard and cellar.", "sv": "David Behar är DJ och musiker från Paris som följde sin passion för vin och slog sig ned i Saint-Chinian. Hans mikrodomän bygger på Syrah och Cinsault — druvsorten som dominerar skifferterroiret i området.\n\nVinerna görs med minimal intervention: inga tillsatser, inga sulfiter. Precis och rytmisk vinifiering — precis som musiken. David kombinerar ett konstnärligt förhållningssätt med ett jordnära hantverk i vingård och källare."}$j$::jsonb;

-- producers.bio_long | Gregory White |  | f07b87f5-e701-4c79-9047-52b774063781
UPDATE producers
SET bio_long = $j${"en": "Gregory White is a Parisian sports journalist who had his Damascus moment in a Bordeaux vineyard and changed career entirely. He studied oenology in Beaune and settled in Aspiran near Pézenas in 2013.\n\nThe estate is 4.8 hectares on alluvial sandy galets soils that give softness and drinkability. Varieties: Syrah, Grenache, Cinsault, Carignan for red, and Grenache Blanc and Terret Bourret for white — vines aged 25 to 80 years.\n\nManual harvest, indigenous yeasts, fermentation in stainless steel tanks, no filtration, no added sulphites. Gregory tastes the wines every day during fermentation and pumps over daily to extract tannins in the right way.\n\nThe wines are known for their glou-glou character — frank, fresh and easy-going. The labels are as direct as the wines: 'White is Rouge' and 'White is Blanc' are barely descriptions, more a joke about the surname.", "sv": "Gregory White är parisisk sportjournalist som fick sitt \"Damaskusögonblick\" i en Bordeaux-vingård och bytte karriär helt. Han studerade oenologi i Beaune och slog sig ned i Aspiran nära Pézenas 2013.\n\nDomänet är 4,8 hektar med alluviala sandiga galets-jordar som ger mjukhet och drinkabilitet. Vinsorter: Syrah, Grenache, Cinsault, Carignan för rött och Grenache Blanc och Terret Bourret för vitt — stockar på 25–80 år.\n\nManuell skörd, naturliga jästsvampar, fermentering i ståltankar, ingen filtrering, inga tillsatta sulfiter. Gregory smakar vinerna varje dag under fermentering och \"pumpar över\" dagligen för att extrahera tanniner på rätt sätt.\n\nVinerna är kända för sin \"glou-glou\"-karaktär — francs, friska och lättsamma. Etiketterna är lika direkta som vinerna: \"White is Rouge\" och \"White is Blanc\" är knappt en beskrivning, mer ett skämt om förnamnet."}$j$::jsonb
WHERE id = 'f07b87f5-e701-4c79-9047-52b774063781'
  AND bio_long = $j${"en": "Gregory White is a Parisian sports journalist who had his Damascus moment in a Bordeaux vineyard and changed career entirely. He studied oenology in Beaune and settled in Aspiran near Pézenas in 2013.\n\nThe estate is 4.8 hectares on alluvial sandy galets soils that give softness and drinkability. Varieties: Syrah, Grenache, Cinsault, Carignan for red, and Grenache Blanc and Terret Bourret for white — vines aged 25 to 80 years.\n\nManual harvest, indigenous yeasts, fermentation in stainless steel tanks, no filtration, no sulphites. Gregory tastes the wines every day during fermentation and pumps over daily to extract tannins in the right way.\n\nThe wines are known for their glou-glou character — frank, fresh and easy-going. The labels are as direct as the wines: 'White is Rouge' and 'White is Blanc' are barely descriptions, more a joke about the surname.", "sv": "Gregory White är parisisk sportjournalist som fick sitt \"Damaskusögonblick\" i en Bordeaux-vingård och bytte karriär helt. Han studerade oenologi i Beaune och slog sig ned i Aspiran nära Pézenas 2013.\n\nDomänet är 4,8 hektar med alluviala sandiga galets-jordar som ger mjukhet och drinkabilitet. Vinsorter: Syrah, Grenache, Cinsault, Carignan för rött och Grenache Blanc och Terret Bourret för vitt — stockar på 25–80 år.\n\nManuell skörd, naturliga jästsvampar, fermentering i ståltankar, ingen filtrering, inga sulfiter. Gregory smakar vinerna varje dag under fermentering och \"pumpar över\" dagligen för att extrahera tanniner på rätt sätt.\n\nVinerna är kända för sin \"glou-glou\"-karaktär — francs, friska och lättsamma. Etiketterna är lika direkta som vinerna: \"White is Rouge\" och \"White is Blanc\" är knappt en beskrivning, mer ett skämt om förnamnet."}$j$::jsonb;

-- producers.bio_long | La Marotte |  | 1d788c78-4b34-471e-903d-0c8a2700cb5a
UPDATE producers
SET bio_long = $j${"en": "La Marotte is situated in and around the village of Clairac, part of La Tour sur Orb, in the north of the Hérault département. Julie Thelen and Xavier Auboux farm some six hectares of organic vines, Ecocert-certified BIO.\n\nTwo-thirds of the vines are old and head-pruned — the gobelet method — on mostly mixed plots: Carignan Blanc, Carignan Noir, Cinsault, Oeillade, Ugni Blanc, Aramon, Terret (all 3 colours), Grenache (all 3 colours), Vermentino, Mourvèdre, Morastel, Alicante, Clairette, Grand Noir de la Calmette and more. One-third are younger, trellised vines pruned using the Cordon de Royat or Guyot method.\n\nThe harvesting is done manually. The grapes are pressed slowly and gently in a vertical hydraulic press dating from the 1930s. The wine is fermented and aged in stainless-steel or glass-fibre vats. Racking and bottling is done by gravity. Vinification occurs without any input whatsoever — no added sulphites, yeasts, clarification agents or enzymes. The wine is not filtered.\n\nGrapes, grapes and only grapes go into their bottles — except lashings of love.", "sv": "La Marotte ligger i Clairac vid foten av La Tour sur Orb i norra Hérault. Det är Julie Thelen och Xavier Auboux som driver domänet — ett par med rötter i kökskulturen som hamnade i vingården av kärlek till råvaran snarare än tradition.\n\nFilosofin är enkel: manuell skörd, inga tillsatser, inga tillsatta sulfiter, ingen intervention i källaren. Vinerna görs av det som finns på egna parceller plus raisin köpt från grannar i biodynamisk eller ekologisk odling. Varje cuvée är ett avtryck av ett specifikt år, en specifik parcell eller en känsla — inte en formel som upprepas.\n\nSortimentet är varierat och föränderligt. Micocoulier, Bienvenu.E.S, Résiste, La Plage, Vivace — namnen berättar mer om platsen och stunden än om druvsort eller stil. Produktionen är liten, tillgängligheten begränsad."}$j$::jsonb
WHERE id = '1d788c78-4b34-471e-903d-0c8a2700cb5a'
  AND bio_long = $j${"en": "La Marotte is situated in and around the village of Clairac, part of La Tour sur Orb, in the north of the Hérault département. Julie Thelen and Xavier Auboux farm some six hectares of organic vines, Ecocert-certified BIO.\n\nTwo-thirds of the vines are old and head-pruned — the gobelet method — on mostly mixed plots: Carignan Blanc, Carignan Noir, Cinsault, Oeillade, Ugni Blanc, Aramon, Terret (all 3 colours), Grenache (all 3 colours), Vermentino, Mourvèdre, Morastel, Alicante, Clairette, Grand Noir de la Calmette and more. One-third are younger, trellised vines pruned using the Cordon de Royat or Guyot method.\n\nThe harvesting is done manually. The grapes are pressed slowly and gently in a vertical hydraulic press dating from the 1930s. The wine is fermented and aged in stainless-steel or glass-fibre vats. Racking and bottling is done by gravity. Vinification occurs without any input whatsoever — no sulphites, yeasts, clarification agents or enzymes. The wine is not filtered.\n\nGrapes, grapes and only grapes go into their bottles — except lashings of love.", "sv": "La Marotte ligger i Clairac vid foten av La Tour sur Orb i norra Hérault. Det är Julie Thelen och Xavier Auboux som driver domänet — ett par med rötter i kökskulturen som hamnade i vingården av kärlek till råvaran snarare än tradition.\n\nFilosofin är enkel: manuell skörd, inga tillsatser, inga sulfiter, ingen intervention i källaren. Vinerna görs av det som finns på egna parceller plus raisin köpt från grannar i biodynamisk eller ekologisk odling. Varje cuvée är ett avtryck av ett specifikt år, en specifik parcell eller en känsla — inte en formel som upprepas.\n\nSortimentet är varierat och föränderligt. Micocoulier, Bienvenu.E.S, Résiste, La Plage, Vivace — namnen berättar mer om platsen och stunden än om druvsort eller stil. Produktionen är liten, tillgängligheten begränsad."}$j$::jsonb;

-- producers.bio_long | La Revolte |  | 143be712-e18d-42af-b0fe-18b0da9d1a59
UPDATE producers
SET bio_long = $j${"en": "Victor Anglade runs La Rêvolte in Pézenas — an estate built on family tradition and a will to do things differently. Five generations of winegrowing family in the background, Victor with a few hectares of his own plots and grapes purchased from family members — uncles, cousins and friends in the region.\n\nThe philosophy is clear: healthy farming, minimal intervention in the cellar. No additives, no added sulphites. Pézenas terroir with its warm, dry Mediterranean character and fruit intensity that demands care in the cellar to maintain balance.\n\nThe wines are simple and straight-backed — they do not try to impress, they are made to be drunk.", "sv": "Victor Anglade driver La Rêvolte i Pézenas — ett domän grundat på familjetradition och en vilja att göra saker på ett nytt sätt. Fem generationer av vinodlande familj i bakgrunden, Victor med ett par hektar egna marker och druvor köpta från familjemedlemmar — farbröder, kusiner och vänner i regionen.\n\nFilosofin är tydlig: hälsosam odling, minimal intervention i källaren. Inga tillsatser, inga tillsatta sulfiter. Pézenas-terroir med varm, torr medelhavskaraktär och en fruit-intensitet som kräver noggrannhet i källaren för att hålla balansen.\n\nVinerna är enkla och rakryggade — de försöker inte imponera, de är gjorda för att drickas."}$j$::jsonb
WHERE id = '143be712-e18d-42af-b0fe-18b0da9d1a59'
  AND bio_long = $j${"en": "Victor Anglade runs La Rêvolte in Pézenas — an estate built on family tradition and a will to do things differently. Five generations of winegrowing family in the background, Victor with a few hectares of his own plots and grapes purchased from family members — uncles, cousins and friends in the region.\n\nThe philosophy is clear: healthy farming, minimal intervention in the cellar. No additives, no sulphites. Pézenas terroir with its warm, dry Mediterranean character and fruit intensity that demands care in the cellar to maintain balance.\n\nThe wines are simple and straight-backed — they do not try to impress, they are made to be drunk.", "sv": "Victor Anglade driver La Rêvolte i Pézenas — ett domän grundat på familjetradition och en vilja att göra saker på ett nytt sätt. Fem generationer av vinodlande familj i bakgrunden, Victor med ett par hektar egna marker och druvor köpta från familjemedlemmar — farbröder, kusiner och vänner i regionen.\n\nFilosofin är tydlig: hälsosam odling, minimal intervention i källaren. Inga tillsatser, inga sulfiter. Pézenas-terroir med varm, torr medelhavskaraktär och en fruit-intensitet som kräver noggrannhet i källaren för att hålla balansen.\n\nVinerna är enkla och rakryggade — de försöker inte imponera, de är gjorda för att drickas."}$j$::jsonb;

-- producers.bio_long | Mas Des Mesures |  | 519bed84-5296-4d63-baf6-5cf3b5955cba
UPDATE producers
SET bio_long = $j${"en": "Vincent Augé is a trained oenologist who chose to go against the grain. He runs Mas des Mesures in Le Pradal in the Haute Vallée de l'Orb — an area in northern Hérault with mountain terrain, a cooler climate and schist soils that differ markedly from coastal Languedoc.\n\nVincent works biodynamically on 3 hectares spread across several parcels between 300 and 400 metres altitude. The varieties include a mix of classic Languedoc types — Grenache, Syrah, Aramon, Carignan, Terret Noir, Alicante-Bouschet and Chardonnay. Many plantings are old gobelet vines aged 50–90 years.\n\nIn the cellar: no additives, no added sulphites, indigenous yeasts only, elevage in stoneware, wood and stainless steel depending on the cuvée. Each wine is an expression of a specific parcel and a specific terroir — Vincent's oenological background shows in the precision, not in the intervention.", "sv": "Vincent Augé är utbildad oenolog som valde att gå mot strömmen. Han driver Mas des Mesures i Le Pradal i Haute Vallée de l'Orb — ett område i norra Hérault med bergsterräng, kallare klimat och skifferjordar som skiljer sig markant från kustens Languedoc.\n\nVincent arbetar biodynamiskt med 3 hektar fördelade på flera parceller mellan 300 och 400 meters höjd. Druvsorten är en blandning av klassiska languedocianska varieteter — Grenache, Syrah, Aramon, Carignan, Terret Noir, Alicante-Bouschet och Chardonnay. Många planteringar är gamla gobelets på 50–90 år.\n\nI källaren: inga tillsatser, inga tillsatta sulfiter, enbart naturliga jästsvampar, elevage i grès, trä och inox beroende på cuvée. Varje vin är ett uttryck av en specifik parcell och ett specifikt terroir — Vincents oenologiska bakgrund syns i precisionen, inte i interventionen."}$j$::jsonb
WHERE id = '519bed84-5296-4d63-baf6-5cf3b5955cba'
  AND bio_long = $j${"en": "Vincent Augé is a trained oenologist who chose to go against the grain. He runs Mas des Mesures in Le Pradal in the Haute Vallée de l'Orb — an area in northern Hérault with mountain terrain, a cooler climate and schist soils that differ markedly from coastal Languedoc.\n\nVincent works biodynamically on 3 hectares spread across several parcels between 300 and 400 metres altitude. The varieties include a mix of classic Languedoc types — Grenache, Syrah, Aramon, Carignan, Terret Noir, Alicante-Bouschet and Chardonnay. Many plantings are old gobelet vines aged 50–90 years.\n\nIn the cellar: no additives, no sulphites, indigenous yeasts only, elevage in stoneware, wood and stainless steel depending on the cuvée. Each wine is an expression of a specific parcel and a specific terroir — Vincent's oenological background shows in the precision, not in the intervention.", "sv": "Vincent Augé är utbildad oenolog som valde att gå mot strömmen. Han driver Mas des Mesures i Le Pradal i Haute Vallée de l'Orb — ett område i norra Hérault med bergsterräng, kallare klimat och skifferjordar som skiljer sig markant från kustens Languedoc.\n\nVincent arbetar biodynamiskt med 3 hektar fördelade på flera parceller mellan 300 och 400 meters höjd. Druvsorten är en blandning av klassiska languedocianska varieteter — Grenache, Syrah, Aramon, Carignan, Terret Noir, Alicante-Bouschet och Chardonnay. Många planteringar är gamla gobelets på 50–90 år.\n\nI källaren: inga tillsatser, inga sulfiter, enbart naturliga jästsvampar, elevage i grès, trä och inox beroende på cuvée. Varje vin är ett uttryck av en specifik parcell och ett specifikt terroir — Vincents oenologiska bakgrund syns i precisionen, inte i interventionen."}$j$::jsonb;

-- producers.short_description | Clos Fantine |  | 30a4559f-0fb3-48f8-9a1c-7215805a1e2d
UPDATE producers
SET short_description = $j${"en": "Carole, Corine and Olivier Andrieu run Clos Fantine in Cabrerolles, Faugères. A 25-hectare family domaine farmed organically since the 1990s. Carignan dominates, and some vines are a hundred years old. No additives, no added sulphites.", "sv": "Carole, Corine och Olivier Andrieu driver Clos Fantine i Cabrerolles, Faugères. Familjedomän på 25 hektar med ekologisk odling sedan 1990-talet. Carignan dominerar — vissa stockar är hundra år gamla. Inga tillsatser, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = '30a4559f-0fb3-48f8-9a1c-7215805a1e2d'
  AND short_description = $j${"en": "Carole, Corine and Olivier Andrieu run Clos Fantine in Cabrerolles, Faugères. A 25-hectare family domaine farmed organically since the 1990s. Carignan dominates, and some vines are a hundred years old. No additives, no sulphites.", "sv": "Carole, Corine och Olivier Andrieu driver Clos Fantine i Cabrerolles, Faugères. Familjedomän på 25 hektar med ekologisk odling sedan 1990-talet. Carignan dominerar — vissa stockar är hundra år gamla. Inga tillsatser, inga sulfiter."}$j$::jsonb;

-- producers.short_description | David Behar |  | 5c6d13a7-82aa-4184-969c-6f3275ada1c5
UPDATE producers
SET short_description = $j${"en": "David Behar is a DJ and vigneron in Saint-Chinian. A micro-domaine built on Syrah and Cinsault. No additives, no added sulphites — the wines are as precise and rhythmic as the music.", "sv": "David Behar är DJ och vigneron i Saint-Chinian. Mikrodomän med Syrah och Cinsault. Inga tillsatser, inga tillsatta sulfiter — vinerna är lika precisa och rytmiska som musiken."}$j$::jsonb
WHERE id = '5c6d13a7-82aa-4184-969c-6f3275ada1c5'
  AND short_description = $j${"en": "David Behar is a DJ and vigneron in Saint-Chinian. A micro-domaine built on Syrah and Cinsault. No additives, no sulphites — the wines are as precise and rhythmic as the music.", "sv": "David Behar är DJ och vigneron i Saint-Chinian. Mikrodomän med Syrah och Cinsault. Inga tillsatser, inga sulfiter — vinerna är lika precisa och rytmiska som musiken."}$j$::jsonb;

-- producers.short_description | Julien Peyras |  | fb189c6d-cd4e-4ee8-914a-c673192d589c
UPDATE producers
SET short_description = $j${"en": "Julien Peyras runs GAEC La Dame Jeanne in Paulhan in Hérault. Organic farming without synthetic products, natural yeasts, no additives, no added sulphites. The range spans from sparkling Clairette to complex blends with long-aged Syrah.", "sv": "Julien Peyras driver GAEC La Dame Jeanne i Paulhan i Hérault. Ekologisk odling utan syntetiska produkter, naturliga jästsvampar, inga tillsatser, inga tillsatta sulfiter. Sortimentet spänner från mousserande Clairette till komplexa assemblager med långlagrad Syrah."}$j$::jsonb
WHERE id = 'fb189c6d-cd4e-4ee8-914a-c673192d589c'
  AND short_description = $j${"en": "Julien Peyras runs GAEC La Dame Jeanne in Paulhan in Hérault. Organic farming without synthetic products, natural yeasts, no additives, no sulphites. The range spans from sparkling Clairette to complex blends with long-aged Syrah.", "sv": "Julien Peyras driver GAEC La Dame Jeanne i Paulhan i Hérault. Ekologisk odling utan syntetiska produkter, naturliga jästsvampar, inga tillsatser, inga sulfiter. Sortimentet spänner från mousserande Clairette till komplexa assemblager med långlagrad Syrah."}$j$::jsonb;

-- producers.short_description | La Marotte |  | 1d788c78-4b34-471e-903d-0c8a2700cb5a
UPDATE producers
SET short_description = $j${"en": "Julie Thelen and Xavier Auboux run La Marotte in Clairac in the Mare valley, Hérault. Natural wine with no additives, no added sulphites, hand-harvested. Their wines are named after places and moods from their everyday lives — not grape variety or appellation.", "sv": "Julie Thelen och Xavier Auboux driver La Marotte i Clairac nära La Tour sur Orb i Hérault. Naturvin utan tillsatser, inga tillsatta sulfiter, manuell skörd. Deras viner är namngivna efter platser och stämningar i deras vardag — inte druvsort eller appellation."}$j$::jsonb
WHERE id = '1d788c78-4b34-471e-903d-0c8a2700cb5a'
  AND short_description = $j${"en": "Julie Thelen and Xavier Auboux run La Marotte in Clairac in the Mare valley, Hérault. Natural wine with no additives, no sulphites, hand-harvested. Their wines are named after places and moods from their everyday lives — not grape variety or appellation.", "sv": "Julie Thelen och Xavier Auboux driver La Marotte i Clairac nära La Tour sur Orb i Hérault. Naturvin utan tillsatser, inga sulfiter, manuell skörd. Deras viner är namngivna efter platser och stämningar i deras vardag — inte druvsort eller appellation."}$j$::jsonb;

-- producers.short_description | La Revolte |  | 143be712-e18d-42af-b0fe-18b0da9d1a59
UPDATE producers
SET short_description = $j${"en": "Victor Anglade runs La Rêvolte in Pézenas with roots in five generations of winegrowing in the region. Own plots plus grapes from family and friends. No additives, no added sulphites — Pézenas terroir without compromise.", "sv": "Victor Anglade driver La Rêvolte i Pézenas med rötter i fem generationer vinodling i regionen. Egna marker plus druvor från familj och vänner. Inga tillsatser, inga tillsatta sulfiter — Pézenas-terroir utan omvägar."}$j$::jsonb
WHERE id = '143be712-e18d-42af-b0fe-18b0da9d1a59'
  AND short_description = $j${"en": "Victor Anglade runs La Rêvolte in Pézenas with roots in five generations of winegrowing in the region. Own plots plus grapes from family and friends. No additives, no sulphites — Pézenas terroir without compromise.", "sv": "Victor Anglade driver La Rêvolte i Pézenas med rötter i fem generationer vinodling i regionen. Egna marker plus druvor från familj och vänner. Inga tillsatser, inga sulfiter — Pézenas-terroir utan omvägar."}$j$::jsonb;

-- producers.short_description | La Robina |  | aeff976b-6327-4f6b-81fa-171c197ef6e4
UPDATE producers
SET short_description = $j${"en": "Family-run natural wine producer outside Berlou in Saint-Chinian. Grapes picked and handled by hand. Fermentation in clay jars, French oak barrels and stainless steel tanks. No additives, no added sulphites.", "sv": "Familjedriven naturvinsproducent utanför Berlou i Saint-Chinian. Vindruvor plockas och hanteras för hand. Fermentering i lerkrukor, franska eekfat och ståltankar. Inga tillsatser, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = 'aeff976b-6327-4f6b-81fa-171c197ef6e4'
  AND short_description = $j${"en": "Family-run natural wine producer outside Berlou in Saint-Chinian. Grapes picked and handled by hand. Fermentation in clay jars, French oak barrels and stainless steel tanks. No additives, no sulphites.", "sv": "Familjedriven naturvinsproducent utanför Berlou i Saint-Chinian. Vindruvor plockas och hanteras för hand. Fermentering i lerkrukor, franska eekfat och ståltankar. Inga tillsatser, inga sulfiter."}$j$::jsonb;

-- producers.short_description | Mas Des Mesures |  | 519bed84-5296-4d63-baf6-5cf3b5955cba
UPDATE producers
SET short_description = $j${"en": "Vincent Augé runs Mas des Mesures in Le Pradal in the Haute Vallée de l'Orb. A trained oenologist working biodynamically on 3 hectares between 300–400 metres altitude. Old vines, no additives, no added sulphites. Each cuvée is linked to a specific parcel.", "sv": "Vincent Augé driver Mas des Mesures i Le Pradal i Haute Vallée de l'Orb. Utbildad oenolog som arbetar biodynamiskt på 3 hektar mellan 300–400 meters höjd. Gamla stockar, inga tillsatser, inga tillsatta sulfiter. Varje cuvée är kopplad till en specifik parcell."}$j$::jsonb
WHERE id = '519bed84-5296-4d63-baf6-5cf3b5955cba'
  AND short_description = $j${"en": "Vincent Augé runs Mas des Mesures in Le Pradal in the Haute Vallée de l'Orb. A trained oenologist working biodynamically on 3 hectares between 300–400 metres altitude. Old vines, no additives, no sulphites. Each cuvée is linked to a specific parcel.", "sv": "Vincent Augé driver Mas des Mesures i Le Pradal i Haute Vallée de l'Orb. Utbildad oenolog som arbetar biodynamiskt på 3 hektar mellan 300–400 meters höjd. Gamla stockar, inga tillsatser, inga sulfiter. Varje cuvée är kopplad till en specifik parcell."}$j$::jsonb;

-- producers.short_description | Meigoon |  | 58e7b9df-2b1c-4d84-81b0-7398146ec2ea
UPDATE producers
SET short_description = $j${"en": "Gauthier Ollivier and Saharnaz Ahangi run Meïgoon in Roquebrun in the Saint-Chinian area. Gauthier started as a vigneron in 2016 under the name Serres de Merly — Saharnaz joined in 2021 and they renamed to Meïgoon. 4 hectares in organic farming, no additives, no added sulphites. Varieties: Cinsault, Grenache, Carignan and Syrah.", "sv": "Gauthier Ollivier och Saharnaz Ahangi driver Meïgoon i Roquebrun i Saint-Chinian-området. Gauthier började som vigneron 2016 under namnet Serres de Merly — Saharnaz kom in 2021 och de bytte namn till Meïgoon. 4 hektar i bio, inga tillsatser, inga tillsatta sulfiter. Druvsort: Cinsault, Grenache, Carignan och Syrah."}$j$::jsonb
WHERE id = '58e7b9df-2b1c-4d84-81b0-7398146ec2ea'
  AND short_description = $j${"en": "Gauthier Ollivier and Saharnaz Ahangi run Meïgoon in Roquebrun in the Saint-Chinian area. Gauthier started as a vigneron in 2016 under the name Serres de Merly — Saharnaz joined in 2021 and they renamed to Meïgoon. 4 hectares in organic farming, no additives, no sulphites. Varieties: Cinsault, Grenache, Carignan and Syrah.", "sv": "Gauthier Ollivier och Saharnaz Ahangi driver Meïgoon i Roquebrun i Saint-Chinian-området. Gauthier började som vigneron 2016 under namnet Serres de Merly — Saharnaz kom in 2021 och de bytte namn till Meïgoon. 4 hektar i bio, inga tillsatser, inga sulfiter. Druvsort: Cinsault, Grenache, Carignan och Syrah."}$j$::jsonb;

-- producers.short_description | Peira Levada |  | 6420c244-0c57-49d5-8ad1-6e7d75960adf
UPDATE producers
SET short_description = $j${"en": "Alexandre Durand founded Pèira Levada in Laurens, Faugères in 2018. Six hectares across ten parcels on schist, marble and limestone. Biodynamic farming, no additives, no added sulphites. The estate's name is Occitan for 'lifted stone' — after the marble menhirs found on the parcels.", "sv": "Alexandre Durand grundade Pèira Levada i Laurens i Faugères 2018. Sex hektar på tio parceller med skiffer, marmor och kalk. Biodynamisk odling, inga tillsatser, inga tillsatta sulfiter. Domänets namn är occitanska för \"lyft sten\" — efter menhirerna av marmor som finns på parcellerna."}$j$::jsonb
WHERE id = '6420c244-0c57-49d5-8ad1-6e7d75960adf'
  AND short_description = $j${"en": "Alexandre Durand founded Pèira Levada in Laurens, Faugères in 2018. Six hectares across ten parcels on schist, marble and limestone. Biodynamic farming, no additives, no sulphites. The estate's name is Occitan for 'lifted stone' — after the marble menhirs found on the parcels.", "sv": "Alexandre Durand grundade Pèira Levada i Laurens i Faugères 2018. Sex hektar på tio parceller med skiffer, marmor och kalk. Biodynamisk odling, inga tillsatser, inga sulfiter. Domänets namn är occitanska för \"lyft sten\" — efter menhirerna av marmor som finns på parcellerna."}$j$::jsonb;

-- producers.short_description | Pierre et l'Étoile |  | 2aa11a2c-8a09-4e08-b249-92927041bd7a
UPDATE producers
SET short_description = $j${"en": "Pierre Regnault founded Pierre et l'Étoile in 2017 in Assignan, Hérault, after years in vineyards and cellars in the Gard. 4.5 hectares across seven parcels on clay-limestone at 270 metres altitude. Organic certification since 2020. Indigenous yeasts, no additives, no added sulphites since 2020. The estate name is a dedication to his partner Estelle.", "sv": "Pierre Regnault grundade Pierre et l'Étoile 2017 i Assignan i Hérault efter år i vingårdar och källare i Gard. 4,5 hektar på sju parceller på argilo-calcaire vid 270 meters höjd. Ekologisk certifiering sedan 2020. Naturliga jästsvampar, inga tillsatser, inga tillsatta sulfiter sedan 2020. Domännamnet är en hälsning till hans partner Estelle."}$j$::jsonb
WHERE id = '2aa11a2c-8a09-4e08-b249-92927041bd7a'
  AND short_description = $j${"en": "Pierre Regnault founded Pierre et l'Étoile in 2017 in Assignan, Hérault, after years in vineyards and cellars in the Gard. 4.5 hectares across seven parcels on clay-limestone at 270 metres altitude. Organic certification since 2020. Indigenous yeasts, no additives, no sulphites since 2020. The estate name is a dedication to his partner Estelle.", "sv": "Pierre Regnault grundade Pierre et l'Étoile 2017 i Assignan i Hérault efter år i vingårdar och källare i Gard. 4,5 hektar på sju parceller på argilo-calcaire vid 270 meters höjd. Ekologisk certifiering sedan 2020. Naturliga jästsvampar, inga tillsatser, inga sulfiter sedan 2020. Domännamnet är en hälsning till hans partner Estelle."}$j$::jsonb;

-- wines.additives | Gregory White | White is Blanc | 394dc83c-d584-408f-8cd7-aac810a8450c
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '394dc83c-d584-408f-8cd7-aac810a8450c'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Gregory White | White is Rouge | 6ab40feb-a6fc-47e1-b4c5-77958b368e55
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '6ab40feb-a6fc-47e1-b4c5-77958b368e55'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Hors Saison | Dans les bois | 6f962b59-e082-4986-9d00-58466d72e7a5
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '6f962b59-e082-4986-9d00-58466d72e7a5'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Hors Saison | Grenade | 6bb433b2-d27b-466f-8b13-87e57e2304f9
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '6bb433b2-d27b-466f-8b13-87e57e2304f9'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Hors Saison | La Mouette | b3042cce-9d7a-4f5c-9c09-dbf3d429c7b5
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'b3042cce-9d7a-4f5c-9c09-dbf3d429c7b5'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Hors Saison | Le Nouveau Western | 0c25db9f-2722-4fcc-aae6-61b873b109ac
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": {"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}}$j$::jsonb
WHERE id = '0c25db9f-2722-4fcc-aae6-61b873b109ac'
  AND additives = $j${"en": "No additives, no sulphites", "sv": {"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}}$j$::jsonb;

-- wines.additives | Hors Saison | Été Indien | 43a22c65-40d7-4d82-912d-21a3133b5bf4
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": {"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}}$j$::jsonb
WHERE id = '43a22c65-40d7-4d82-912d-21a3133b5bf4'
  AND additives = $j${"en": "No additives, no sulphites", "sv": {"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}}$j$::jsonb;

-- wines.additives | La Graine Sauvage | Leno Dolce Sole | 0ae0b834-238c-455c-97e2-66def6bba93d
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '0ae0b834-238c-455c-97e2-66def6bba93d'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Graine Sauvage | Rocalhas | 76990683-6d25-4bf4-96cb-4fd5912f11d1
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '76990683-6d25-4bf4-96cb-4fd5912f11d1'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Graine Sauvage | Rocalhas | dae7f1d0-f7bc-4f44-8dc4-03780de71d17
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'dae7f1d0-f7bc-4f44-8dc4-03780de71d17'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Graine Sauvage | Vermentino | 73e5906d-c3d1-49df-9a6b-aa5ff4821fe0
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '73e5906d-c3d1-49df-9a6b-aa5ff4821fe0'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Marotte | Bienvenu-e-s | c606b878-2170-4a77-8daa-eae161361670
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb
WHERE id = 'c606b878-2170-4a77-8daa-eae161361670'
  AND additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb;

-- wines.additives | La Marotte | Debout | a38a5297-7e1e-4a9d-875c-b464860feaaf
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
WHERE id = 'a38a5297-7e1e-4a9d-875c-b464860feaaf'
  AND additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb;

-- wines.additives | La Marotte | La Plage | 68180a1e-2da7-40d7-81aa-02ecf2450e67
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb
WHERE id = '68180a1e-2da7-40d7-81aa-02ecf2450e67'
  AND additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb;

-- wines.additives | La Marotte | Micocoulier | 22da5d35-a253-40e8-a870-82dd3230601a
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
WHERE id = '22da5d35-a253-40e8-a870-82dd3230601a'
  AND additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb;

-- wines.additives | La Marotte | Résiste | 8f142080-120b-419b-b213-32477b43f1af
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb
WHERE id = '8f142080-120b-419b-b213-32477b43f1af'
  AND additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": {"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}}}$j$::jsonb;

-- wines.additives | La Marotte | Vivace | 586aa643-e716-4ced-ae58-5b98e2826a79
UPDATE wines
SET additives = $j${"en": "No additives — no added sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga tillsatta sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb
WHERE id = '586aa643-e716-4ced-ae58-5b98e2826a79'
  AND additives = $j${"en": "No additives — no sulphites, yeasts, fining agents or enzymes", "sv": "Inga tillsatser — inga sulfiter, jästsvampar, klarningsmedel eller enzymer"}$j$::jsonb;

-- wines.additives | La Revolte | La Rêvolte Rouge | b600c59f-fa87-40e4-a85a-24e8da1edec9
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'b600c59f-fa87-40e4-a85a-24e8da1edec9'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Revolte | Le Fils du Lézard | 01eefa70-78e1-4585-9f44-91e52de0b7be
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '01eefa70-78e1-4585-9f44-91e52de0b7be'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Revolte | L’Oeil du Lézard | 8672f330-b6b3-4e91-a1a1-1f74f475e85b
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '8672f330-b6b3-4e91-a1a1-1f74f475e85b'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Robina | Douce Brise | 76b08775-8ee6-4647-988d-b082a9edcdfe
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '76b08775-8ee6-4647-988d-b082a9edcdfe'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Robina | Nouvelle Vauge | 108a1c2e-71be-4d48-b5e3-06cf2286d333
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '108a1c2e-71be-4d48-b5e3-06cf2286d333'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | La Robina | Papillon M | df80c23e-9f78-4561-a384-e8247671f0bf
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'df80c23e-9f78-4561-a384-e8247671f0bf'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Le Bouc A Trois Pattes | Hippie Killer | 523f6b93-8eaf-48f2-ad62-0cdddbb757b4
UPDATE wines
SET additives = $j${"en": "No added sulphites since 2013, no additives", "sv": "Inga tillsatta sulfiter sedan 2013, inga tillsatser"}$j$::jsonb
WHERE id = '523f6b93-8eaf-48f2-ad62-0cdddbb757b4'
  AND additives = $j${"en": "No sulphites since 2013, no additives", "sv": "Inga sulfiter sedan 2013, inga tillsatser"}$j$::jsonb;

-- wines.additives | Le Bouc A Trois Pattes | Miss Piggy Blues | 509e0e4f-bb1c-475a-86a6-2632065f82cd
UPDATE wines
SET additives = $j${"en": "No added sulphites, no additives", "sv": "Inga tillsatta sulfiter, inga tillsatser"}$j$::jsonb
WHERE id = '509e0e4f-bb1c-475a-86a6-2632065f82cd'
  AND additives = $j${"en": "No sulphites, no additives", "sv": "Inga sulfiter, inga tillsatser"}$j$::jsonb;

-- wines.additives | Le Bouc A Trois Pattes | Perdu dans les Dunes | 756c39af-4357-4a02-a96d-2f38301d9530
UPDATE wines
SET additives = $j${"en": "No added sulphites since 2013, no additives", "sv": "Inga tillsatta sulfiter sedan 2013, inga tillsatser"}$j$::jsonb
WHERE id = '756c39af-4357-4a02-a96d-2f38301d9530'
  AND additives = $j${"en": "No sulphites since 2013, no additives", "sv": "Inga sulfiter sedan 2013, inga tillsatser"}$j$::jsonb;

-- wines.additives | Le Bouc A Trois Pattes | Quel âne de course | 044fc03c-9abc-437c-bafb-f96728ae3ec1
UPDATE wines
SET additives = $j${"en": "No added sulphites, no additives", "sv": "Inga tillsatta sulfiter, inga tillsatser"}$j$::jsonb
WHERE id = '044fc03c-9abc-437c-bafb-f96728ae3ec1'
  AND additives = $j${"en": "No sulphites, no additives", "sv": "Inga sulfiter, inga tillsatser"}$j$::jsonb;

-- wines.additives | Le Bouc A Trois Pattes | Un coup de kuq | e37dc294-8139-4269-aa4d-8b001b0e4235
UPDATE wines
SET additives = $j${"en": "No added sulphites, no additives", "sv": "Inga tillsatta sulfiter, inga tillsatser"}$j$::jsonb
WHERE id = 'e37dc294-8139-4269-aa4d-8b001b0e4235'
  AND additives = $j${"en": "No sulphites, no additives", "sv": "Inga sulfiter, inga tillsatser"}$j$::jsonb;

-- wines.additives | Mas Des Mesures | Claparedes | 2515ad2c-a947-4704-a132-6822d8b98abb
UPDATE wines
SET additives = $j${"en": "Inga tillsatser, inga tillsatta sulfiter", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '2515ad2c-a947-4704-a132-6822d8b98abb'
  AND additives = $j${"en": "Inga tillsatser, inga sulfiter", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Mas Des Mesures | Fractale | 45b447d0-d552-4ed7-9672-44b956c30873
UPDATE wines
SET additives = $j${"sv": {"sv": "Noll dosage — inga tillsatta sulfiter eller socker efter dégorgement"}}$j$::jsonb
WHERE id = '45b447d0-d552-4ed7-9672-44b956c30873'
  AND additives = $j${"sv": {"sv": "Noll dosage — inga sulfiter eller socker efter dégorgement"}}$j$::jsonb;

-- wines.additives | Mas Des Mesures | Kairos | cb9f0070-24b0-4a6a-8cb0-0f6679033bbf
UPDATE wines
SET additives = $j${"sv": {"sv": "Inga tillsatser, inga tillsatta sulfiter"}}$j$::jsonb
WHERE id = 'cb9f0070-24b0-4a6a-8cb0-0f6679033bbf'
  AND additives = $j${"sv": {"sv": "Inga tillsatser, inga sulfiter"}}$j$::jsonb;

-- wines.additives | Mas Des Mesures | Septentrion | 9301970e-5f34-473b-b891-5c5910ba8783
UPDATE wines
SET additives = $j${"en": "Inga tillsatser, inga tillsatta sulfiter", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '9301970e-5f34-473b-b891-5c5910ba8783'
  AND additives = $j${"en": "Inga tillsatser, inga sulfiter", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Meigoon | Extralucide | 1fc52e4d-a4b9-4c99-b00f-9f5678cd2f61
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '1fc52e4d-a4b9-4c99-b00f-9f5678cd2f61'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Meigoon | Flore Et Sens | 5dc37adf-91e9-4c22-b2a3-3e3ad371941f
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '5dc37adf-91e9-4c22-b2a3-3e3ad371941f'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Meigoon | Jardin d'Ivresse | c6811980-c1a7-4f9a-be12-32de6b7ce311
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'c6811980-c1a7-4f9a-be12-32de6b7ce311'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Meigoon | Ultravision | dde4e61c-ef3a-461b-beca-0eb8f5d60cd3
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'dde4e61c-ef3a-461b-beca-0eb8f5d60cd3'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Peira Levada | Carignan Radical | 59fa7644-063f-4a5d-b0fe-b8c9b6555131
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '59fa7644-063f-4a5d-b0fe-b8c9b6555131'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Peira Levada | Otium | b80544b6-1790-473c-bb93-b98874cab410
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'b80544b6-1790-473c-bb93-b98874cab410'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Peira Levada | Pachorra | efd0f571-069e-40fc-bb0b-6d21cf87c69d
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'efd0f571-069e-40fc-bb0b-6d21cf87c69d'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Pierre et l'Étoile | Maelström | c1902533-25b4-42aa-95f0-636511b24845
UPDATE wines
SET additives = $j${"en": "No added sulphites since 2020, no additives", "sv": "Inga tillsatta sulfiter sedan 2020, inga tillsatser"}$j$::jsonb
WHERE id = 'c1902533-25b4-42aa-95f0-636511b24845'
  AND additives = $j${"en": "No sulphites since 2020, no additives", "sv": "Inga sulfiter sedan 2020, inga tillsatser"}$j$::jsonb;

-- wines.additives | Pierre et l'Étoile | Zeph | d3ea35a2-5f25-4cb3-9265-323b98bbdacb
UPDATE wines
SET additives = $j${"en": "No added sulphites since 2020, no additives", "sv": "Inga tillsatta sulfiter sedan 2020, inga tillsatser"}$j$::jsonb
WHERE id = 'd3ea35a2-5f25-4cb3-9265-323b98bbdacb'
  AND additives = $j${"en": "No sulphites since 2020, no additives", "sv": "Inga sulfiter sedan 2020, inga tillsatser"}$j$::jsonb;

-- wines.additives | Thomas Chany | Les Tremieres | c6c7b17f-10d4-4b3a-ac22-dccc38cd2700
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'c6c7b17f-10d4-4b3a-ac22-dccc38cd2700'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Thomas Chany | Mangourass | 054d6290-87ac-4bd7-8303-cf0d37abdf99
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = '054d6290-87ac-4bd7-8303-cf0d37abdf99'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Thomas Chany | Matiere Noire | dbd196cd-d788-44df-b458-d981d70ebd6b
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'dbd196cd-d788-44df-b458-d981d70ebd6b'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.additives | Thomas Chany | Première Longuer | fccecd72-b548-4aae-92d0-df97e6ece283
UPDATE wines
SET additives = $j${"en": "No additives, no added sulphites", "sv": "Inga tillsatser, inga tillsatta sulfiter"}$j$::jsonb
WHERE id = 'fccecd72-b548-4aae-92d0-df97e6ece283'
  AND additives = $j${"en": "No additives, no sulphites", "sv": "Inga tillsatser, inga sulfiter"}$j$::jsonb;

-- wines.description | Pierre et l'Étoile | Maelström | c1902533-25b4-42aa-95f0-636511b24845
UPDATE wines
SET description = $j${"sv": "Another Carignan, but a different animal. Pierre Regnault uses 65-year-old vines, five days of whole-cluster maceration, and lets the wine age on its lees before bottling by gravity in April 2023. No added sulfites, no fining, no filtration. The kind of wine where every decision in the cellar is about getting out of the way."}$j$::jsonb
WHERE id = 'c1902533-25b4-42aa-95f0-636511b24845'
  AND description = $j${"sv": "Another Carignan, but a different animal. Pierre Regnault uses 65-year-old vines, five days of whole-cluster maceration, and lets the wine age on its lees before bottling by gravity in April 2023. No sulfites, no fining, no filtration. The kind of wine where every decision in the cellar is about getting out of the way."}$j$::jsonb;

-- wines.summary | Clos Fantine | Courtiol | 296d25ed-74cc-4531-8cfb-aee189dfbf33
UPDATE wines
SET summary = $j${"en": "Courtiol is Clos Fantine's top cuvée — a selection of the estate's best grapes each vintage, dominated by Mourvèdre and Carignan from vines up to 80 years old on Faugères' schist slopes. Corine, Carole and Olivier Andrieu age the wine for 18–24 months in concrete without added sulphites, fining or filtration.", "sv": "Courtiol är Clos Fantines premiercuvée — ett urval av domänets bästa druvor varje årgång, dominerat av Mourvèdre och Carignan från upp till 80-åriga stockar på Faugères skiffersluttningar. Corine, Carole och Olivier Andrieu låter vinet lagras 18–24 månader i betongkar utan tillsatta sulfiter, filtrering eller klarning."}$j$::jsonb
WHERE id = '296d25ed-74cc-4531-8cfb-aee189dfbf33'
  AND summary = $j${"en": "Courtiol is Clos Fantine's top cuvée — a selection of the estate's best grapes each vintage, dominated by Mourvèdre and Carignan from vines up to 80 years old on Faugères' schist slopes. Corine, Carole and Olivier Andrieu age the wine for 18–24 months in concrete without sulphites, fining or filtration.", "sv": "Courtiol är Clos Fantines premiercuvée — ett urval av domänets bästa druvor varje årgång, dominerat av Mourvèdre och Carignan från upp till 80-åriga stockar på Faugères skiffersluttningar. Corine, Carole och Olivier Andrieu låter vinet lagras 18–24 månader i betongkar utan varken sulfiter, filtrering eller fining."}$j$::jsonb;

-- wines.summary | Le Bouc A Trois Pattes | Hippie Killer | 523f6b93-8eaf-48f2-ad62-0cdddbb757b4
UPDATE wines
SET summary = $j${"en": "Hippie Killer is Le Bouc à Trois Pattes' lightest red — a fresh blend from Wim Wagemans' 305-metre vineyard in Mons-la-Trivalle. The cooler mountain terroir delivers a freshness and acidity rarely found in Languedoc. No added sulphites since 2013, native yeasts.", "sv": "Hippie Killer är Le Bouc à Trois Pattes lättaste röda — ett fräscht assemblage från Wim Wagemans 305-meters vingård i Mons-la-Trivalle. Det kallare bergsterroiret ger en friskhet och syra som är sällsynt i Languedoc. Inga tillsatta sulfiter sedan 2013, indigena jästsvampar."}$j$::jsonb
WHERE id = '523f6b93-8eaf-48f2-ad62-0cdddbb757b4'
  AND summary = $j${"en": "Hippie Killer is Le Bouc à Trois Pattes' lightest red — a fresh blend from Wim Wagemans' 305-metre vineyard in Mons-la-Trivalle. The cooler mountain terroir delivers a freshness and acidity rarely found in Languedoc. No sulphites since 2013, native yeasts.", "sv": "Hippie Killer är Le Bouc à Trois Pattes lättaste röda — ett fräscht assemblage från Wim Wagemans 305-meters vingård i Mons-la-Trivalle. Det kallare bergsterroiret ger en friskhet och syra som är sällsynt i Languedoc. Ingen sulfiter sedan 2013, indigena jästsvampar."}$j$::jsonb;

-- wines.summary | Le Bouc A Trois Pattes | Perdu dans les Dunes | 756c39af-4357-4a02-a96d-2f38301d9530
UPDATE wines
SET summary = $j${"en": "Perdu dans les Dunes is Le Bouc à Trois Pattes' orange wine — Chardonnay with skin contact from 305m altitude, produced without added sulphites since 2013. The cooler mountain climate delivers a freshness and precision unusual for the orange style. Light, balanced and harmonious.", "sv": "Perdu dans les Dunes är Le Bouc à Trois Pattes' orangevin — Chardonnay med skalkontakt från 305m höjd, producerat sedan 2013 utan tillsatta sulfiter. Det kallare bergklimatet ger en friskhet och precision som är ovanlig för orange stil. Lätt, balanserat och harmoniskt."}$j$::jsonb
WHERE id = '756c39af-4357-4a02-a96d-2f38301d9530'
  AND summary = $j${"en": "Perdu dans les Dunes is Le Bouc à Trois Pattes' orange wine — Chardonnay with skin contact from 305m altitude, produced without sulphites since 2013. The cooler mountain climate delivers a freshness and precision unusual for the orange style. Light, balanced and harmonious.", "sv": "Perdu dans les Dunes är Le Bouc à Trois Pattes' orangevin — Chardonnay med skalkontakt från 305m höjd, producerat sedan 2013 utan sulfiter. Det kallare bergklimatet ger en friskhet och precision som är ovanlig för orange stil. Lätt, balanserat och harmoniskt."}$j$::jsonb;

-- wines.summary | Le Bouc A Trois Pattes | Quel âne de course | 044fc03c-9abc-437c-bafb-f96728ae3ec1
UPDATE wines
SET summary = $j${"en": "Quel âne de course is Wim Wagemans' 100% Carignan — early-harvested from old vines on gneiss, granite and schist at 305m in Mons. Intentionally harvested before full ripeness to preserve freshness and acidity. No added sulphites since 2013. More structure and depth than Hippie Killer.", "sv": "Quel âne de course är Wim Wagemans' 100% Carignan — tidig skörd från gamla stockar på gnejs, granit och skiffer på 305m i Mons. Skördas medvetet tidigt för att bevara friskhet och syra. Inga tillsatta sulfiter sedan 2013. Mer struktur och djup än Hippie Killer."}$j$::jsonb
WHERE id = '044fc03c-9abc-437c-bafb-f96728ae3ec1'
  AND summary = $j${"en": "Quel âne de course is Wim Wagemans' 100% Carignan — early-harvested from old vines on gneiss, granite and schist at 305m in Mons. Intentionally harvested before full ripeness to preserve freshness and acidity. No sulphites since 2013. More structure and depth than Hippie Killer.", "sv": "Quel âne de course är Wim Wagemans' 100% Carignan — tidig skörd från gamla stockar på gnejs, granit och skiffer på 305m i Mons. Skördas medvetet tidigt för att bevara friskhet och syra. Inga sulfiter sedan 2013. Mer struktur och djup än Hippie Killer."}$j$::jsonb;

-- wines.summary | Peira Levada | Otium | b80544b6-1790-473c-bb93-b98874cab410
UPDATE wines
SET summary = $j${"en": "Otium is Pèira Levada's most accessible wine — a blend of all the estate's varieties (Carignan, Cinsault, Grenache and Syrah) from ten small parcels in Faugères. Alexandre Durand vinifies without added sulphites using native yeasts. Otium is the best entry point into Pèira Levada.", "sv": "Otium är Pèira Levadas mest tillgängliga vin — ett assemblage av alla domänets druvsort (Carignan, Cinsault, Grenache och Syrah) från tio småparceller i Faugères. Alexandre Durand vinifierar utan tillsatta sulfiter med indigena jästsvampar. Otium är bästa ingångspunkten till Pèira Levada."}$j$::jsonb
WHERE id = 'b80544b6-1790-473c-bb93-b98874cab410'
  AND summary = $j${"en": "Otium is Pèira Levada's most accessible wine — a blend of all the estate's varieties (Carignan, Cinsault, Grenache and Syrah) from ten small parcels in Faugères. Alexandre Durand vinifies without sulphites using native yeasts. Otium is the best entry point into Pèira Levada.", "sv": "Otium är Pèira Levadas mest tillgängliga vin — ett assemblage av alla domänets druvsort (Carignan, Cinsault, Grenache och Syrah) från tio småparceller i Faugères. Alexandre Durand vinifierar utan sulfiter med indigena jästsvampar. Otium är bästa ingångspunkten till Pèira Levada."}$j$::jsonb;

-- wines.summary | Pierre et l'Étoile | Maelström | c1902533-25b4-42aa-95f0-636511b24845
UPDATE wines
SET summary = $j${"en": "Maelström is Pierre Regnault's 100% Carignan — from 65-year-old vines on clay-limestone at 270m in Assignan. Whole clusters, 5-day maceration, aged on lees and bottled by gravity without added sulphites. A pure, direct and alive Carignan with clear site character.", "sv": "Maelström är Pierre Regnaults 100% Carignan — från 65-åriga stockar på argilo-calcaire vid 270m i Assignan. Hela druvklasar, 5 dagars maceration, lagrat på lees och buteljerat med tyngdkraft utan tillsatta sulfiter. En ren, direkt och levande Carignan med tydlig platskaraktär."}$j$::jsonb
WHERE id = 'c1902533-25b4-42aa-95f0-636511b24845'
  AND summary = $j${"en": "Maelström is Pierre Regnault's 100% Carignan — from 65-year-old vines on clay-limestone at 270m in Assignan. Whole clusters, 5-day maceration, aged on lees and bottled by gravity without sulphites. A pure, direct and alive Carignan with clear site character.", "sv": "Maelström är Pierre Regnaults 100% Carignan — från 65-åriga stockar på argilo-calcaire vid 270m i Assignan. Hela druvklasar, 5 dagars maceration, lagrat på lees och buteljerat med tyngdkraft utan sulfiter. En ren, direkt och levande Carignan med tydlig platskaraktär."}$j$::jsonb;

-- wines.winemaker_notes | Gregory White | White is Blanc | 394dc83c-d584-408f-8cd7-aac810a8450c
UPDATE wines
SET winemaker_notes = $j${"en": "Gregory White, former sports journalist from Paris, started his natural wine estate in Aspiran near Pézenas in 2013 after a career change. 4.8 hectares on sandy galets soils, vines 25–80 years old. Manual harvest, native yeasts, no filtration, no added sulphites. The glou-glou style is the philosophy: frank, fresh and direct.", "sv": "Gregory White, f.d. sportjournalist från Paris, startade sitt naturvinsdomän i Aspiran nära Pézenas 2013 efter ett karriärbyte. 4,8 hektar på sandiga galetsjordar, stockar 25–80 år. Manuell skörd, naturliga jästsvampar, ingen filtrering, inga tillsatta sulfiter. \"Glou-glou\"-stilen är filosofin: franks, friskt och direkt."}$j$::jsonb
WHERE id = '394dc83c-d584-408f-8cd7-aac810a8450c'
  AND winemaker_notes = $j${"en": "Gregory White, former sports journalist from Paris, started his natural wine estate in Aspiran near Pézenas in 2013 after a career change. 4.8 hectares on sandy galets soils, vines 25–80 years old. Manual harvest, native yeasts, no filtration, no sulphites. The glou-glou style is the philosophy: frank, fresh and direct.", "sv": "Gregory White, f.d. sportjournalist från Paris, startade sitt naturvinsdomän i Aspiran nära Pézenas 2013 efter ett karriärbyte. 4,8 hektar på sandiga galetsjordar, stockar 25–80 år. Manuell skörd, naturliga jästsvampar, ingen filtrering, inga sulfiter. \"Glou-glou\"-stilen är filosofin: franks, friskt och direkt."}$j$::jsonb;

-- wines.winemaker_notes | Gregory White | White is Rouge | 6ab40feb-a6fc-47e1-b4c5-77958b368e55
UPDATE wines
SET winemaker_notes = $j${"en": "Gregory White, Aspiran, Pézenas. Former sports journalist, started in 2013. 4.8 hectares of sandy galets soils, manual harvest, native yeasts, no filtration, no added sulphites. Gregory tastes his wines daily during fermentation and uses pump-over to extract tannins at exactly the right level.", "sv": "Gregory White, Aspiran, Pézenas. F.d. sportjournalist, startade 2013. 4,8 ha sandiga galetsjordar, manuell skörd, naturliga jästsvampar, ingen filtrering, inga tillsatta sulfiter. Gregory smakar vinerna dagligen under fermentasion och \"pumpar över\" för att extrahera tanniner precis rätt."}$j$::jsonb
WHERE id = '6ab40feb-a6fc-47e1-b4c5-77958b368e55'
  AND winemaker_notes = $j${"en": "Gregory White, Aspiran, Pézenas. Former sports journalist, started in 2013. 4.8 hectares of sandy galets soils, manual harvest, native yeasts, no filtration, no sulphites. Gregory tastes his wines daily during fermentation and uses pump-over to extract tannins at exactly the right level.", "sv": "Gregory White, Aspiran, Pézenas. F.d. sportjournalist, startade 2013. 4,8 ha sandiga galetsjordar, manuell skörd, naturliga jästsvampar, ingen filtrering, inga sulfiter. Gregory smakar vinerna dagligen under fermentasion och \"pumpar över\" för att extrahera tanniner precis rätt."}$j$::jsonb;

-- wines.winemaker_notes | La Revolte | La Rêvolte Rouge | b600c59f-fa87-40e4-a85a-24e8da1edec9
UPDATE wines
SET winemaker_notes = $j${"en": "Victor Anglade runs La Rêvolte in Pézenas with roots in five generations of winegrowing family. Own parcels plus grapes from family members and friends in the region. Philosophy: healthy farming, no additives, no added sulphites. Pézenas terroir without compromise.", "sv": "Victor Anglade driver La Rêvolte i Pézenas med rötter i fem generationers vinodlarfamilj. Egna marker plus druvor från familjemedlemmar och vänner i regionen. Filosofin: hälsosam odling, inga tillsatser, inga tillsatta sulfiter. Pézenas-terroir utan omvägar."}$j$::jsonb
WHERE id = 'b600c59f-fa87-40e4-a85a-24e8da1edec9'
  AND winemaker_notes = $j${"en": "Victor Anglade runs La Rêvolte in Pézenas with roots in five generations of winegrowing family. Own parcels plus grapes from family members and friends in the region. Philosophy: healthy farming, no additives, no sulphites. Pézenas terroir without compromise.", "sv": "Victor Anglade driver La Rêvolte i Pézenas med rötter i fem generationers vinodlarfamilj. Egna marker plus druvor från familjemedlemmar och vänner i regionen. Filosofin: hälsosam odling, inga tillsatser, inga sulfiter. Pézenas-terroir utan omvägar."}$j$::jsonb;

-- wines.winemaker_notes | La Revolte | Le Fils du Lézard | 01eefa70-78e1-4585-9f44-91e52de0b7be
UPDATE wines
SET winemaker_notes = $j${"en": "Victor Anglade, La Rêvolte, Pézenas. Five generations of winegrowing family, own parcels and purchased grapes. No additives, no added sulphites. Le Fils du Lézard shows that the Pézenas terroir works as well for whites as for reds.", "sv": "Victor Anglade, La Rêvolte, Pézenas. Fem generationer vinodlarfamilj, egna marker och köpta druvor. Inga tillsatser, inga tillsatta sulfiter. Le Fils du Lézard visar att Pézenas-terroiret fungerar lika bra för vita som för röda."}$j$::jsonb
WHERE id = '01eefa70-78e1-4585-9f44-91e52de0b7be'
  AND winemaker_notes = $j${"en": "Victor Anglade, La Rêvolte, Pézenas. Five generations of winegrowing family, own parcels and purchased grapes. No additives, no sulphites. Le Fils du Lézard shows that the Pézenas terroir works as well for whites as for reds.", "sv": "Victor Anglade, La Rêvolte, Pézenas. Fem generationer vinodlarfamilj, egna marker och köpta druvor. Inga tillsatser, inga sulfiter. Le Fils du Lézard visar att Pézenas-terroiret fungerar lika bra för vita som för röda."}$j$::jsonb;

-- wines.winemaker_notes | La Revolte | L’Oeil du Lézard | 8672f330-b6b3-4e91-a1a1-1f74f475e85b
UPDATE wines
SET winemaker_notes = $j${"en": "Victor Anglade, La Rêvolte, Pézenas. Five generations of winegrowing family, own parcels and grapes purchased from family members in the region. No additives, no added sulphites — Pézenas terroir in its purest form.", "sv": "Victor Anglade, La Rêvolte, Pézenas. Fem generationer vinodlarfamilj, egna marker och köpta druvor från familjemedlemmar i regionen. Inga tillsatser, inga tillsatta sulfiter — Pézenas-terroir i sin renaste form."}$j$::jsonb
WHERE id = '8672f330-b6b3-4e91-a1a1-1f74f475e85b'
  AND winemaker_notes = $j${"en": "Victor Anglade, La Rêvolte, Pézenas. Five generations of winegrowing family, own parcels and grapes purchased from family members in the region. No additives, no sulphites — Pézenas terroir in its purest form.", "sv": "Victor Anglade, La Rêvolte, Pézenas. Fem generationer vinodlarfamilj, egna marker och köpta druvor från familjemedlemmar i regionen. Inga tillsatser, inga sulfiter — Pézenas-terroir i sin renaste form."}$j$::jsonb;

-- wines.winemaker_notes | La Robina | Douce Brise | 76b08775-8ee6-4647-988d-b082a9edcdfe
UPDATE wines
SET winemaker_notes = $j${"en": "La Robina is a family-run estate outside Berlou in Saint-Chinian. Grapes are harvested and handled by hand. Fermentation in clay amphorae, French oak barrels and stainless steel tanks depending on the cuvée. No additives, no added sulphites. Berlou's schist is one of Languedoc's finest terroirs for mineral, fresh natural wines.", "sv": "La Robina är ett familjedriven domän utanför Berlou i Saint-Chinian. Vindruvor skördas och hanteras för hand. Fermentasion i lerkrukor, franska ekfat och ståltankar beroende på cuvée. Inga tillsatser, inga tillsatta sulfiter. Berlous skiffer är en av Languedocs finaste terroir för minerala, friska naturviner."}$j$::jsonb
WHERE id = '76b08775-8ee6-4647-988d-b082a9edcdfe'
  AND winemaker_notes = $j${"en": "La Robina is a family-run estate outside Berlou in Saint-Chinian. Grapes are harvested and handled by hand. Fermentation in clay amphorae, French oak barrels and stainless steel tanks depending on the cuvée. No additives, no sulphites. Berlou's schist is one of Languedoc's finest terroirs for mineral, fresh natural wines.", "sv": "La Robina är ett familjedriven domän utanför Berlou i Saint-Chinian. Vindruvor skördas och hanteras för hand. Fermentasion i lerkrukor, franska ekfat och ståltankar beroende på cuvée. Inga tillsatser, inga sulfiter. Berlous skiffer är en av Languedocs finaste terroir för minerala, friska naturviner."}$j$::jsonb;

-- wines.winemaker_notes | La Robina | Nouvelle Vauge | 108a1c2e-71be-4d48-b5e3-06cf2286d333
UPDATE wines
SET winemaker_notes = $j${"en": "La Robina, family-run estate in Berlou, Saint-Chinian. Hand-harvested, no additives, no added sulphites. Fermentation in clay amphorae, French oak barrels and stainless steel tanks. The stone cellar at 300m provides natural cooling that preserves freshness and fruit character.", "sv": "La Robina, familjedriven domän i Berlou, Saint-Chinian. Handskördat, inga tillsatser, inga tillsatta sulfiter. Fermentasion i lerkrukor, franska ekfat och ståltankar. Stenkällaren på 300m ger naturlig kylning som bevarar friskhet och frukt i vinerna."}$j$::jsonb
WHERE id = '108a1c2e-71be-4d48-b5e3-06cf2286d333'
  AND winemaker_notes = $j${"en": "La Robina, family-run estate in Berlou, Saint-Chinian. Hand-harvested, no additives, no sulphites. Fermentation in clay amphorae, French oak barrels and stainless steel tanks. The stone cellar at 300m provides natural cooling that preserves freshness and fruit character.", "sv": "La Robina, familjedriven domän i Berlou, Saint-Chinian. Handskördat, inga tillsatser, inga sulfiter. Fermentasion i lerkrukor, franska ekfat och ståltankar. Stenkällaren på 300m ger naturlig kylning som bevarar friskhet och frukt i vinerna."}$j$::jsonb;

-- wines.winemaker_notes | La Robina | Papillon M | df80c23e-9f78-4561-a384-e8247671f0bf
UPDATE wines
SET winemaker_notes = $j${"en": "La Robina, family-run estate in Berlou, Saint-Chinian. Hand-harvested, no additives, no added sulphites. Papillon M (M = Mourvèdre) is the estate's ambitious attempt to show what this difficult-to-grow variety can achieve on Berlou's schist slopes — when handled gently and given sufficient time.", "sv": "La Robina, familjedriven domän i Berlou, Saint-Chinian. Handskördat, inga tillsatser, inga tillsatta sulfiter. Papillon M (M = Mourvèdre) är domänets ambitiösa satsning på att visa vad denna svårodlade druvsort kan åstadkomma på Berlous skiffersidor — när den behandlas med varsam hand och lång tid."}$j$::jsonb
WHERE id = 'df80c23e-9f78-4561-a384-e8247671f0bf'
  AND winemaker_notes = $j${"en": "La Robina, family-run estate in Berlou, Saint-Chinian. Hand-harvested, no additives, no sulphites. Papillon M (M = Mourvèdre) is the estate's ambitious attempt to show what this difficult-to-grow variety can achieve on Berlou's schist slopes — when handled gently and given sufficient time.", "sv": "La Robina, familjedriven domän i Berlou, Saint-Chinian. Handskördat, inga tillsatser, inga sulfiter. Papillon M (M = Mourvèdre) är domänets ambitiösa satsning på att visa vad denna svårodlade druvsort kan åstadkomma på Berlous skiffersidor — när den behandlas med varsam hand och lång tid."}$j$::jsonb;

-- wines.winemaker_notes | Le Bouc A Trois Pattes | Hippie Killer | 523f6b93-8eaf-48f2-ad62-0cdddbb757b4
UPDATE wines
SET winemaker_notes = $j${"en": "Wim Wagemans is Belgian and settled in Mons-la-Trivalle, Haute Vallée de l'Orb in 2006. Vineyard at 305m on clay and limestone. Native yeasts, no added sulphites since 2013. Blends vary from year to year. The cooler climate — cold nights, northerly wind — gives the grapes more acidity and finesse.", "sv": "Wim Wagemans är belgisk och slog sig ned i Mons-la-Trivalle, Haute Vallée de l'Orb 2006. Vingård på 305m med lerjord och kalksten. Naturliga jästsvampar, inga tillsatta sulfiter sedan 2013. Assemblagerna varierar från år till år. Det kallare klimatet — kalla nätter, nordlig vind — ger druvorna mer syra och finhet."}$j$::jsonb
WHERE id = '523f6b93-8eaf-48f2-ad62-0cdddbb757b4'
  AND winemaker_notes = $j${"en": "Wim Wagemans is Belgian and settled in Mons-la-Trivalle, Haute Vallée de l'Orb in 2006. Vineyard at 305m on clay and limestone. Native yeasts, no sulphites since 2013. Blends vary from year to year. The cooler climate — cold nights, northerly wind — gives the grapes more acidity and finesse.", "sv": "Wim Wagemans är belgisk och slog sig ned i Mons-la-Trivalle, Haute Vallée de l'Orb 2006. Vingård på 305m med lerjord och kalksten. Naturliga jästsvampar, inga sulfiter sedan 2013. Assemblagerna varierar från år till år. Det kallare klimatet — kalla nätter, nordlig vind — ger druvorna mer syra och finhet."}$j$::jsonb;

-- wines.winemaker_notes | Le Bouc A Trois Pattes | Miss Piggy Blues | 509e0e4f-bb1c-475a-86a6-2632065f82cd
UPDATE wines
SET winemaker_notes = $j${"en": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgian who settled in the Haute Vallée de l'Orb in 2006. No added sulphites since 2013, native yeasts, experimental blending philosophy.", "sv": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgier som slog sig ned i Haute Vallée de l'Orb 2006. Inga tillsatta sulfiter sedan 2013, indigena jästsvampar, experimenterande assemblagestil."}$j$::jsonb
WHERE id = '509e0e4f-bb1c-475a-86a6-2632065f82cd'
  AND winemaker_notes = $j${"en": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgian who settled in the Haute Vallée de l'Orb in 2006. No sulphites since 2013, native yeasts, experimental blending philosophy.", "sv": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgier som slog sig ned i Haute Vallée de l'Orb 2006. Inga sulfiter sedan 2013, indigena jästsvampar, experimenterande assemblagestil."}$j$::jsonb;

-- wines.winemaker_notes | Le Bouc A Trois Pattes | Perdu dans les Dunes | 756c39af-4357-4a02-a96d-2f38301d9530
UPDATE wines
SET winemaker_notes = $j${"en": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgian winemaker since 2006. No added sulphites since 2013 — Perdu dans les Dunes was ahead of the curve on this. Chardonnay with skin contact is unusual but well-motivated: the cooler climate provides more acidity that holds together the orange wine's broader structure.", "sv": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgier sedan 2006. Inga tillsatta sulfiter sedan 2013 — Perdu dans les Dunes var tidigt ut med detta. Chardonnay med skalkontakt är ovanligt men välmotiverat: kallare klimat ger mer syra som håller ihop orangevinets bredare struktur."}$j$::jsonb
WHERE id = '756c39af-4357-4a02-a96d-2f38301d9530'
  AND winemaker_notes = $j${"en": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgian winemaker since 2006. No sulphites since 2013 — Perdu dans les Dunes was ahead of the curve on this. Chardonnay with skin contact is unusual but well-motivated: the cooler climate provides more acidity that holds together the orange wine's broader structure.", "sv": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgier sedan 2006. Inga sulfiter sedan 2013 — Perdu dans les Dunes var tidigt ut med detta. Chardonnay med skalkontakt är ovanligt men välmotiverat: kallare klimat ger mer syra som håller ihop orangevinets bredare struktur."}$j$::jsonb;

-- wines.winemaker_notes | Le Bouc A Trois Pattes | Quel âne de course | 044fc03c-9abc-437c-bafb-f96728ae3ec1
UPDATE wines
SET winemaker_notes = $j${"en": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgian winemaker since 2006. Carignan is harvested early to avoid over-ripeness — a deliberate philosophy to retain natural freshness in a warm climate. No added sulphites since 2013.", "sv": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgier sedan 2006. Carignan skördas tidigt för att undvika övermognad — en medveten filosofi för att behålla naturlig friskhet i ett varmt klimat. Inga tillsatta sulfiter sedan 2013."}$j$::jsonb
WHERE id = '044fc03c-9abc-437c-bafb-f96728ae3ec1'
  AND winemaker_notes = $j${"en": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgian winemaker since 2006. Carignan is harvested early to avoid over-ripeness — a deliberate philosophy to retain natural freshness in a warm climate. No sulphites since 2013.", "sv": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgier sedan 2006. Carignan skördas tidigt för att undvika övermognad — en medveten filosofi för att behålla naturlig friskhet i ett varmt klimat. Inga sulfiter sedan 2013."}$j$::jsonb;

-- wines.winemaker_notes | Le Bouc A Trois Pattes | Un coup de kuq | e37dc294-8139-4269-aa4d-8b001b0e4235
UPDATE wines
SET winemaker_notes = $j${"en": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgian winemaker since 2006. No added sulphites since 2013. Alicante-Bouschet was originally developed by Henri Bouschet in the 19th century to add colour to paler wines — here it is used for its genuine character.", "sv": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgier sedan 2006. Inga tillsatta sulfiter sedan 2013. Alicante-Bouschet odlades ursprungligen av Henri Bouschet på 1800-talet för att ge mer färg till blekare viner — här används det för sin genuina karaktär."}$j$::jsonb
WHERE id = 'e37dc294-8139-4269-aa4d-8b001b0e4235'
  AND winemaker_notes = $j${"en": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgian winemaker since 2006. No sulphites since 2013. Alicante-Bouschet was originally developed by Henri Bouschet in the 19th century to add colour to paler wines — here it is used for its genuine character.", "sv": "Wim Wagemans, Le Bouc à Trois Pattes, Mons-la-Trivalle, 305m. Belgier sedan 2006. Inga sulfiter sedan 2013. Alicante-Bouschet odlades ursprungligen av Henri Bouschet på 1800-talet för att ge mer färg till blekare viner — här används det för sin genuina karaktär."}$j$::jsonb;

-- wines.winemaker_notes | Peira Levada | Pachorra | efd0f571-069e-40fc-bb0b-6d21cf87c69d
UPDATE wines
SET winemaker_notes = $j${"en": "Alexandre Durand, Pèira Levada, Faugères. Biodynamic and organic farming (Bureau Veritas) since 2018. The marble terroir in the eastern parcels gives a distinct character — angular, saline and driven — that differs from the schist parcels' expression. No additives, no added sulphites.", "sv": "Alexandre Durand, Pèira Levada, Faugères. Biodynamisk och ekologisk odling (Bureau Veritas) 2018. Marmor-terroiret i de östliga parcellerna ger en distinkt karaktär — vinkelformad, salin och driven — som skiljer sig från skifferparcellernadriven karaktär. Inga tillsatser, inga tillsatta sulfiter."}$j$::jsonb
WHERE id = 'efd0f571-069e-40fc-bb0b-6d21cf87c69d'
  AND winemaker_notes = $j${"en": "Alexandre Durand, Pèira Levada, Faugères. Biodynamic and organic farming (Bureau Veritas) since 2018. The marble terroir in the eastern parcels gives a distinct character — angular, saline and driven — that differs from the schist parcels' expression. No additives, no sulphites.", "sv": "Alexandre Durand, Pèira Levada, Faugères. Biodynamisk och ekologisk odling (Bureau Veritas) 2018. Marmor-terroiret i de östliga parcellerna ger en distinkt karaktär — vinkelformad, salin och driven — som skiljer sig från skifferparcellernadriven karaktär. Inga tillsatser, inga sulfiter."}$j$::jsonb;

-- wines.winemaker_notes | Pierre et l'Étoile | Maelström | c1902533-25b4-42aa-95f0-636511b24845
UPDATE wines
SET winemaker_notes = $j${"en": "Pierre Regnault founded Pierre et l'Étoile in 2017 in Assignan after years in vineyards and cellars in the Gard. 4.5 hectares across seven parcels at 270m altitude on clay-limestone. Organic certification since 2020, no added sulphites since 2020, native yeasts. The estate name is a nod to his partner Estelle.", "sv": "Pierre Regnault grundade Pierre et l'Étoile 2017 i Assignan efter år i vingårdar och källare i Gard. 4,5 hektar på sju parceller vid 270m höjd på argilo-calcaire. Ekologisk sedan 2020, inga tillsatta sulfiter sedan 2020, naturliga jästsvampar. Domännamnet är en hälsning till hans partner Estelle."}$j$::jsonb
WHERE id = 'c1902533-25b4-42aa-95f0-636511b24845'
  AND winemaker_notes = $j${"en": "Pierre Regnault founded Pierre et l'Étoile in 2017 in Assignan after years in vineyards and cellars in the Gard. 4.5 hectares across seven parcels at 270m altitude on clay-limestone. Organic certification since 2020, no sulphites since 2020, native yeasts. The estate name is a nod to his partner Estelle.", "sv": "Pierre Regnault grundade Pierre et l'Étoile 2017 i Assignan efter år i vingårdar och källare i Gard. 4,5 hektar på sju parceller vid 270m höjd på argilo-calcaire. Ekologisk sedan 2020, inga sulfiter sedan 2020, naturliga jästsvampar. Domännamnet är en hälsning till hans partner Estelle."}$j$::jsonb;

-- wines.winemaker_notes | Pierre et l'Étoile | Zeph | d3ea35a2-5f25-4cb3-9265-323b98bbdacb
UPDATE wines
SET winemaker_notes = $j${"en": "Pierre Regnault, Pierre et l'Étoile, Assignan, 270m. Founded 2017, organic since 2020, no added sulphites since 2020. Zeph takes its name from Zéphyr — the gentle westerly wind. Early harvest is a deliberate strategy to keep alcohol low and freshness high.", "sv": "Pierre Regnault, Pierre et l'Étoile, Assignan, 270m. Grundat 2017, ekologisk sedan 2020, inga tillsatta sulfiter sedan 2020. Zeph heter sitt namn från Zéphyr — den milda västliga vinden. Tidig skörd är en medveten strategi för att hålla alkoholen låg och friskheteten hög."}$j$::jsonb
WHERE id = 'd3ea35a2-5f25-4cb3-9265-323b98bbdacb'
  AND winemaker_notes = $j${"en": "Pierre Regnault, Pierre et l'Étoile, Assignan, 270m. Founded 2017, organic since 2020, no sulphites since 2020. Zeph takes its name from Zéphyr — the gentle westerly wind. Early harvest is a deliberate strategy to keep alcohol low and freshness high.", "sv": "Pierre Regnault, Pierre et l'Étoile, Assignan, 270m. Grundat 2017, ekologisk sedan 2020, inga sulfiter sedan 2020. Zeph heter sitt namn från Zéphyr — den milda västliga vinden. Tidig skörd är en medveten strategi för att hålla alkoholen låg och friskheteten hög."}$j$::jsonb;

