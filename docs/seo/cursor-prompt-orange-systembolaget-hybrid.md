# Cursor-prompt: svensk orange-guide på Systembolaget, kombinerad version

4 november 2026. Gäller /guider/basta-orange-naturviner-systembolaget.

**Bakgrund:** #152 (2 nov) bytte sidan från den datadrivna listan (`renderSystembolagetRankedListPage`) till en statisk artikel (`renderArticleGuidePage`). Texten blev bättre, men bilder, priser, rangordning, bortvalda viner och fyra extraviner försvann, och listan uppdateras inte längre från databasen.

**Redan gjort i databasen (Claude, 4 nov):** vinanteckningarna för Binner Bombisch (id 29) och Grape Republic Bianco Macerato (id 42) är omskrivna. Påståendet om Vin Méthode Nature-certifiering och superlativet "Japans mest kända" är borttagna, på svenska och engelska.

```
Restore the data-driven Swedish orange Systembolaget guide and keep the good parts
of the editorial rewrite from #152. Swedish page only:
/guider/basta-orange-naturviner-systembolaget. Do not change the English page
/guides/best-orange-natural-wines-systembolaget.

1. RECON (report before changing)
   - Diff app/guider/basta-orange-naturviner-systembolaget/page.tsx and
     lib/guides/articles/best-orange-natural-wines-systembolaget.ts between
     525f72e (before #152) and HEAD.
   - Does renderSystembolagetRankedListPage support an author byline, Person
     author schema and per-wine facts (grape, alcohol, assortment, organic)?
     List what is missing.

2. RENDERING
   - Switch the Swedish page back to buildSystembolagetRankedListMetadata and
     renderSystembolagetRankedListPage with category "orange", as before #152.
   - This restores: wine images, Systembolaget prices, the ranked list from
     systembolaget_guide_wines, the extra recommended wines (sort_order 100),
     the "avoid" wines section, ItemList JSON-LD and the reviewed date from
     last_reviewed_at.

3. KEEP FROM #152 (move into the content object the ranked list reads)
   - Author byline "Av Axel Samuelson, grundare av PACT · Senast granskad: {date}"
     and Person author in Article JSON-LD. Use the reviewed date the ranked list
     already derives. If the ranked list cannot render a byline, add optional
     support for it, used only when content.author is set, so other lists are
     unchanged.
   - Lede, without "Vi visar inga priser".
   - Section "Vårt urval i korthet".
   - Section "Så har vi valt", including "Inte alla viner på listan är naturvin".
   - Sections "Vad är orange vin?" and "Orange vin och mat".
   - All six FAQs from #152, as visible FAQ and FAQPage JSON-LD.
   - Per-wine fact list (Producent och region, Druva, Alkohol, Sortiment, Odling
     when is_organic) rendered from the database fields on each ranked row. If
     this needs a change in RankedWineRow, make it optional and enable it only
     for this page.

4. RESTORE FROM BEFORE #152
   - H1: "Bästa orange vin på Systembolaget 2026"
   - Title unchanged: "Bästa orange vin på Systembolaget – vårt urval".
   - Independence sentence in the lede: "Listan är oberoende. PACT säljer inte på
     Systembolaget och tjänar ingenting på vad du väljer." Do not mention
     Languedoc.
   - Section "Vad vi inte listar" explaining the avoid list, so the avoided wines
     (Nanit Orange, Petite Orange, Côté Mas, Santa Julia) are named on the page.

5. REMOVE
   - "Vi visar inga priser."
   - The hardcoded wine list and the "Fler från Radikon" block. Wines come from the
     database only.
   - The hardcoded "Också värt att känna till" block. Pino Román and the other
     extra wines come from the database.

Rules:
- Keep URL, canonical and the hreflang pair with the English page
- Keep the H1 font and the layout styling added in #152 if it applies cleanly
- Report every piece of content removed, before and after
- No new npm packages, do not touch components/ui/
- Open a PR. Do not merge until Axel has approved it.

Expected result: the Swedish page shows images and prices again, lists 8 ranked
wines plus the extra recommended wines and the avoid list from the database,
has the byline, the six FAQs and the editorial sections, and H1
"Bästa orange vin på Systembolaget 2026".
```

## Efter PR

Skicka PR-länken eller förhandsvisningen till Claude för granskning innan merge. Begär indexering efter deploy.

## Process för Grok framöver

Ändringar på sidor som redan rankar ska ligga som PR och granskas innan merge. Gäller särskilt de övriga Systembolaget-guiderna tills den här sidan har tre till fyra veckors data.
