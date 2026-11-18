# Cursor-prompter: Lättdruckna viner

11 november 2026. Två sidor mot olika sökningar:

| Sida | URL sv / en | Riktar sig mot |
|---|---|---|
| Systembolaget-listan (i dag glouglou) | `/guider/lattdruckna-naturviner-systembolaget` / `/guides/easy-drinking-natural-wines-systembolaget` | lättdrucket rött vin systembolaget (260/mån), lättdrucket rött vin (90), lätta röda viner (50) |
| Shopsida i PACT | `/vin/lattdruckna-naturviner` / `/wine/easy-drinking-natural-wine` | lättdruckna viner, lättdruckna naturviner, glou glou i text |

**Underlag (Ubersuggest, Sverige, 11 nov):** sökningarna på glou glou gäller barer: glou glou vinbar 720, bar glou glou 480, glou glou 320, glou glou linköping 140, glou glou varberg 110. glou glou vin, glou-glou viner och vad är glou glou har ingen mätbar volym. Glouglou-guiden har haft 10 visningar sedan 15 augusti. Därför bär ingen sida glou glou i titeln, men båda förklarar begreppet i texten.

**Listans innehåll i dag:** 19 synliga viner, varav 14 röda, 4 mousserande och 1 rosé. Det passar sökningen på rött utan ändringar.

**Kategorinyckeln `glouglou` behålls** i databasen, MCP-verktygen och `GUIDE_WINE_CATEGORIES`. Bara URL, titlar och text ändras.

Kör i ordning: prompt 0, klistra in svaret, sedan 1 och 2.

---

## Prompt 0. Recon

```
Analyse without changing anything. Answer briefly per point.

1. GLOUGLOU LIST
   - Files for the two glouglou routes, the article copy file, and its entries in
     SYSTEMBOLAGET_RANKED_LISTS, BILINGUAL_ARTICLE_GUIDES, bilingual-guide-slug-pairs,
     SV_/EN_SYSTEMBOLAGET_CARDS and revalidateSystembolagetGuideCategory("glouglou").
   - Every internal link to /guider/basta-glouglou-viner-systembolaget or
     /guides/best-glou-glou-wines-systembolaget (grep, including article copy, the
     guides hub, related-list links and the sitemap).
   - Where are permanent redirects defined (next.config, middleware, a redirects
     table)? Show one existing guide redirect as an example.

2. SHOP FILTER
   - Where is the shop filter for /vin and /wine built (components, the function that
     maps filter state to a path or query string, and the server-side filtering)?
   - How do the region pages work: the file that decides that exactly one region and
     no other path dimension gives /vin/naturvin-{slug}, the noindex logic for ?region=,
     the 3-live-wines index threshold, and where region page copy comes from
     (lib/wine-region-category-content.ts).
   - wines.tags is text[] with values like light_easy, dinner_wine, fruit_forward.
     Is it used anywhere in the shop today (filter, card badges, quiz, search)?
     Is it exposed in the public product type?
   - Is there a sitemap function for shop category pages? How are colour and region
     pages added to it?

Make no changes.
```

---

## Prompt 1. Döp om Systembolaget-listan

```
Rename the Systembolaget ranked list "glouglou" to "easy-drinking natural wines".
The internal category key stays "glouglou" everywhere (database, MCP tools,
GUIDE_WINE_CATEGORIES, getGuideWines, revalidation tags). Only URLs, copy and labels
change.

1. ROUTES
   - Move the pages to:
     sv /guider/lattdruckna-naturviner-systembolaget
     en /guides/easy-drinking-natural-wines-systembolaget
   - Permanent redirects (301/308, same mechanism as the existing guide redirects):
     /guider/basta-glouglou-viner-systembolaget -> /guider/lattdruckna-naturviner-systembolaget
     /guides/best-glou-glou-wines-systembolaget -> /guides/easy-drinking-natural-wines-systembolaget
   - Update SYSTEMBOLAGET_RANKED_LISTS, BILINGUAL_ARTICLE_GUIDES,
     bilingual-guide-slug-pairs (sync test must pass), hub cards and
     revalidateSystembolagetGuideCategory("glouglou") to the new paths.
   - Update every internal link found in recon to the new URL. No internal link may
     point at a redirect.

2. COPY (article file; rename it to match the new slug)
   Swedish:
   - Title: "Lättdruckna viner på Systembolaget: rött, pét-nat och rosé"
   - H1: "Lättdruckna naturviner på Systembolaget"
   - Meta description: "Lätta, fräscha naturviner på Systembolaget, de flesta röda.
     Det som i naturvinsvärlden kallas glou glou, utvalt och rankat av oss."
   - Intro: "Lättdruckna viner är lätta i kroppen, fräscha och ofta lite lägre i alkohol.
     De flesta på listan är röda viner på druvor som gamay, país, frappato, zweigelt och
     pinot noir. Inom naturvinsvärlden kallas stilen glou glou, franskans ljudord för när
     vinet klunkas ur glaset."
   - H2 before the list: "Lättdrucket rött vin och andra lättdruckna naturviner"
   - Hub card label: "Lättdruckna viner"
   English:
   - Title: "Easy-drinking wines at Systembolaget: red, pét-nat and rosé"
   - H1: "Easy-drinking natural wines at Systembolaget"
   - Meta description: "Light, fresh natural wines at Systembolaget, mostly red. What
     the natural wine world calls glou glou, selected and ranked by us."
   - Intro: "Easy-drinking wines are light-bodied, fresh and often a little lower in
     alcohol. Most wines on this list are reds from grapes such as gamay, país,
     frappato, zweigelt and pinot noir. In natural wine the style is called glou glou,
     French for the sound of wine being gulped."
   - H2: "Easy-drinking red wine and other easy-drinking natural wines"
   - Hub card label: "Easy-drinking wines"
   Keep the rest of the article (FAQ, ranking explanation) but:
   - Replace "glouglou" or "glou-glou" as a list name in headings and labels with the
     new wording. The word may remain in body text and the FAQ.
   - FAQ, replace with these three (sv / en):
     1. "Vad betyder glou glou?" -> "Glou glou är franskans ljudord för klunkande. Inom
        naturvin används det om lätta, fräscha viner som är gjorda för att drickas
        snarare än analyseras."
        "What does glou glou mean?" -> "Glou glou is French for the sound of gulping. In
        natural wine it describes light, fresh wines made to be drunk rather than
        analysed."
     2. "Vilka röda viner är lättdruckna?" -> "Viner på lätta röda druvor som gamay,
        pinot noir, país, frappato, zweigelt och cinsault, gärna med kort skalkontakt och
        lägre alkohol. De flesta vinerna på listan är sådana."
        "Which red wines are easy-drinking?" -> same meaning.
     3. "Ska lättdrucket rött vin serveras kallt?" -> "Många mår bra av att serveras
        svalare än rumstemperatur, kring 14 till 16 grader."
        "Should easy-drinking red wine be served chilled?" -> same meaning.

3. Do not change the ranking, the wines, or the other eight lists.

Rules:
- No new npm packages
- Do not touch components/ui/
- TypeScript strict, no any

Expected result: the old URLs 301 to the new ones, the hub card says
"Lättdruckna viner", the sitemap lists only the new URLs, and the list shows the same
19 wines in the same order.
```

---

## Prompt 2. Karaktär-filter och shopsidan

Anpassa efter svaret på prompt 0, avsnitt 2.

```
Add a "Karaktär" / "Character" filter to the shop based on wines.tags, and an
indexable category page for the tag light_easy. Follow the region page pattern exactly.

1. FILTER
   - New filter group "Karaktär" (sv) / "Character" (en), multi-select, built from
     wines.tags. The filter shows exactly these ten values, in this order. Each value
     maps to one or more database tags:
       value          sv                   en                        tags
       light_easy     Lättdrucket          Easy-drinking             light_easy
       fruit_forward  Fruktigt             Fruit-forward             fruit_forward
       mineral        Mineraliskt          Mineral                   mineral_driven
       dinner         Till middagen        With dinner               dinner_wine
       aperitif       Aperitif             Aperitif                  aperitif
       everyday       Vardagsvin           Everyday                  everyday
       classic        Klassiskt            Classic                   classic
       first_natural  Bra första naturvin  Good first natural wine   gateway_natural
       complex        Komplext             Complex                   structured, complex
       unusual        Udda                 Unusual                   out_of_the_ordinary, funky_wild
   - These database tags are NOT shown in the filter and must not be deleted or
     changed: terroir_showcase, social_wine, winemaker_signature, collectors_item,
     celebration. Any other unknown tag is ignored.
   - Keep the mapping in one typed const in lib/ (value -> {sv, en, tags[]}). The
     filter value (left column) is what goes in the URL, not the database tag.
   - A wine matches a value if it has ANY of that value's tags. Several selected
     values also match on ANY (union), consistent with the other multi-select groups.
     A wine with both structured and complex counts once under Komplext.
   - Show a value only when at least one live wine in the current selection has it,
     and show the count, like the other filter groups.
   - Server-rendered <a href> links for filter values, as on the colour and region
     filters, so Google can follow the light_easy link.

2. URLS
   - Exactly one character value selected, it is light_easy, and no other path
     dimension: /vin/lattdruckna-naturviner (sv) and /wine/easy-drinking-natural-wine
     (en).
   - Every other character selection, or light_easy combined with colour, region or
     another character: ?character=<value>[,<value>] on the current path, noindex,follow,
     canonical to the path without the parameter. No combination pages.
   - Only light_easy gets a path now. Do not create path pages for other tags.

3. CATEGORY PAGE (light_easy)
   - Indexable and in the sitemap when at least 3 live wines (wine and producer live)
     have light_easy. Fewer: noindex,follow. Same check as the region pages.
   - Hreflang sv/en, x-default en, canonical self, as on the other category pages.
   - Copy in the same structure as lib/wine-region-category-content.ts:
     Swedish
     - Title: "Lättdruckna viner: naturviner med hemleverans | PACT"
     - H1: "Lättdruckna naturviner"
     - Meta description: "Lätta, fräscha naturviner som är gjorda för att drickas.
       Det som kallas glou glou, med hemleverans i Sverige."
     - Intro: "Lättdruckna viner är lätta i kroppen, fräscha och ofta lite lägre i
       alkohol. Inom naturvinsvärlden kallas stilen glou glou, franskans ljudord för
       klunkande. Här är vinerna i vårt sortiment som vi har märkt som lättdruckna."
     - Short text after the grid: "Vill du hellre handla på Systembolaget? Vi har
       rankat de lättdruckna naturvinerna där också." linking to
       /guider/lattdruckna-naturviner-systembolaget.
     English
     - Title: "Easy-drinking natural wines | PACT"
     - H1: "Easy-drinking natural wines"
     - Meta description: "Light, fresh natural wines made to be drunk. What the
       natural wine world calls glou glou."
     - Intro: "Easy-drinking wines are light-bodied, fresh and often a little lower in
       alcohol. In natural wine the style is called glou glou, French for the sound of
       gulping. These are the wines in our range that we have marked as easy-drinking."
     - No Systembolaget link on the English page.
   - Copy rules: no "utan tillsatser", no claims about buying from Languedoc or
     "direct", no time pressure, no price comparisons.

4. LINKS
   - The Systembolaget list (prompt 1) links to /vin/lattdruckna-naturviner with
     "Lättdruckna naturviner med hemleverans" below the list (sv only).
   - Add the category page to the shop's category navigation where colour and region
     pages are listed.

Rules:
- No new npm packages
- Do not touch components/ui/
- TypeScript strict, no any, filter input through Zod

Expected result: /vin/lattdruckna-naturviner lists the live wines tagged light_easy
(30 per 2026-11-11), is in the sitemap, /vin?character=fruit_forward is noindex
with canonical /vin, and the Karaktär group shows exactly the ten values above.
Per 2026-11-11 the live counts are: Till middagen 79, Fruktigt 49, Udda 48,
Mineraliskt 40, Aperitif 31, Lättdrucket 30, Klassiskt 30, Vardagsvin 29,
Komplext 28, Bra första naturvin 26.
```

---

## Efter deploy

- Begär indexering av de två nya Systembolaget-URL:erna och `/vin/lattdruckna-naturviner` i Search Console.
- Lägg `light_easy` på fler viner i admin om sidan ska växa. 30 live-viner per 11 november.
- 34 av 168 live-viner saknar taggar och syns inte under något karaktärsval. Tagga dem innan filtret går live.

## Beslut 11 november: värden i Karaktär-filtret

Tio värden visas: Lättdrucket, Fruktigt, Mineraliskt, Till middagen, Aperitif, Vardagsvin, Klassiskt, Bra första naturvin, Komplext (structured + complex) och Udda (out_of_the_ordinary + funky_wild).

Döljs i filtret men finns kvar i databasen: terroir_showcase och winemaker_signature (interna etiketter), social_wine (26 av 30 lättdruckna har den också), collectors_item (10 viner) och celebration (8 viner).
