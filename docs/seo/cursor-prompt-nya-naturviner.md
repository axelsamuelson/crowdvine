# Cursor-prompter: Nya naturviner på Systembolaget

28 oktober 2026. Ny guidesida som listar naturviner som nyss släppts eller släpps snart i Systembolagets tillfälliga sortiment och webblanseringar.

**Redan gjort i databasen (Claude, 28 okt):**
- Migration `systembolaget_new_releases_category`: kategorin `new` tillåten i `systembolaget_curated`, och `product_launch_date` tillagd sist i vyn `systembolaget_guide_wines`.
- 15 utkast i kategorin `new` (id 155 till 169), alla `is_published = false`.

**Sökord (Ubersuggest, Sverige):** tillfälligt sortiment systembolaget 1 300/mån (SD 11), systembolaget nyheter 320, systembolaget släpp 140, tillfälligt sortiment systembolaget 2026 140.

Kör i ordning. Prompt 0 först, klistra in svaret innan prompt 1.

---

## Prompt 0. Recon

```
Analyse the following without changing anything. Answer briefly per point.

1. GUIDE LISTS
   - Where are the Systembolaget ranked-list guides defined (red, white, orange, sparkling,
     rose, budget, glouglou, petnat, best)? Give file paths for: the category config/registry,
     the page route(s), BILINGUAL_ARTICLE_GUIDES, the hub card registry, FAQ JSON-LD, and
     the wine card component.
   - How is the category list typed? Is there a single source of truth (union type, const
     array, Zod enum) or is it repeated in several places? List every place the nine
     category strings appear, including MCP tool schemas and /admin/systembolaget.
   - How are wines ordered on a list page today (ranking algorithm file and function)?
   - How is revalidation done for guide pages (revalidate export, revalidateTag, on-demand)?
     Does publishing in /admin/systembolaget trigger revalidation?

2. MCP TOOLS
   - File(s) for add_curated_wine, update_curated_wine, list_curated_entries,
     list_guide_wines and search_systembolaget_products. Show the category enum.

3. MIGRATIONS
   - Highest migration number in migrations/. Show the most recent migration that
     touched systembolaget_guide_wines.

4. SITEMAP AND HREFLANG
   - How guide URLs enter the sitemap and how hreflang/canonical is set for a bilingual
     guide (one example file).

Make no changes.
```

---

## Prompt 1. Datamodell och verktyg

Recon körd 28 okt. Nästa lediga migrationsnummer är 236.

```
Add the Systembolaget curation category "new" (new and upcoming releases). The database is
already migrated in production (migration name: systembolaget_new_releases_category).
Mirror it in the repo and wire the category through the code.

1. MIGRATION
   Create migrations/236_systembolaget_new_releases_category.sql. Idempotent:
   - ALTER TABLE systembolaget_curated DROP CONSTRAINT IF EXISTS sb_curated_category_chk,
     then ADD it with the nine categories from migrations/214 plus 'new'.
   - CREATE OR REPLACE VIEW systembolaget_guide_wines: copy the definition from
     migrations/218_systembolaget_wine_score.sql exactly, and append p.product_launch_date
     as the LAST column after score_adjust. Add a comment that new columns must always be
     appended last so CREATE OR REPLACE keeps working.

2. SINGLE SOURCE OF TRUTH
   In lib/systembolaget/guide-wines.ts, export
     export const GUIDE_WINE_CATEGORIES = ["red", "white", "orange", "sparkling", "rose",
       "budget", "glouglou", "petnat", "best", "new"] as const
     export type GuideWineCategory = (typeof GUIDE_WINE_CATEGORIES)[number]
   Replace the hardcoded lists with imports of this const in:
   - lib/mcp/tools/systembolaget.ts (categorySchema = z.enum(GUIDE_WINE_CATEGORIES))
   - app/api/admin/systembolaget/curated/route.ts and curated/[id]/route.ts
   - app/admin/systembolaget/page.tsx (CurateForm union and the <select> options)
   - app/api/cron/revalidate-systembolaget-guides/route.ts (ALLOWED)
   Do NOT add "new" to SYSTEMBOLAGET_RANKED_LISTS or PRIMARY_STYLE_CATEGORIES. "new" is not
   a ranked list. If any code iterates SYSTEMBOLAGET_RANKED_LISTS assuming it covers every
   category, report it.

3. DATA ACCESS
   - Add product_launch_date (string | null) to the GuideWine row type and to the select in
     getGuideWines.
   - getGuideWines must NOT call orderCategoryWines when category = "new". Return those rows
     unordered; the page orders them by date.
   - revalidateSystembolagetGuideCategory("new") busts the "new" tags and the two new paths
     (added in prompt 2). It must not revalidate the parent "best" list for "new".

4. MCP TOOLS (lib/mcp/tools/systembolaget.ts)
   - list_curated_entries, list_guide_wines, add_curated_wine, update_curated_wine and
     get_curated_ranking accept "new". add_curated_wine still always writes
     is_published=false.
   - search_systembolaget_products: check what its category parameter does. If it only
     concerns curation (exclude_curated or similar), "new" is fine. If it maps to product
     attributes (colour, price cap), keep the nine-value enum there via a separate schema.
   - search_systembolaget_products gets two optional filters, launched_after and
     launched_before (ISO date strings, z.string().date()), filtering product_launch_date,
     and returns product_launch_date in every result.
   - list_guide_wines returns product_launch_date.

5. ADMIN
   app/admin/systembolaget/page.tsx groups rows by category heading. Make sure "new" gets a
   readable heading ("Nya och kommande släpp") and show product_launch_date on each row in
   that group.

Rules:
- TypeScript strict, no any, all external input through Zod
- No new npm packages
- Do not touch components/ui/

Expected result: build passes, the nine existing guides render unchanged, and
list_curated_entries with category "new" returns ids 155-169.
```

---

## Prompt 2. Sidan

```
Build a bilingual guide page listing new and upcoming natural wines at Systembolaget.
Follow the existing Systembolaget guide pattern, but this page is a release calendar, not
a ranked list.

1. ROUTES AND REGISTRATION
   - app/guides/new-natural-wines-systembolaget/page.tsx
   - app/guider/nya-naturviner-systembolaget/page.tsx
   - Article copy in lib/guides/articles/new-natural-wines-systembolaget.ts, same shape as
     the best-*-systembolaget.ts files, including faqs.
   - Register in lib/guides/bilingual-article-guides.ts and
     lib/guides/bilingual-guide-slug-pairs.ts (the sync test must pass).
   - Hub cards in SV_SYSTEMBOLAGET_CARDS and EN_SYSTEMBOLAGET_CARDS in
     lib/guides/guide-copy.ts, gated on the article being published, like pet nat.
   - Sitemap follows automatically via publishedBilingualArticleGuides().
   - Metadata via buildArticleGuideMeta with xDefault: "en", like
     buildSystembolagetRankedListMetadata.
   - Add the two paths to revalidateSystembolagetGuideCategory("new").

2. RENDERER
   Create renderSystembolagetReleasesPage in lib/guides/systembolaget-releases.tsx. Do not
   modify renderSystembolagetRankedListPage. Reuse RankedWineRow for the card. If it requires
   a rank number or renders rank arrows, add an optional prop that hides both, defaulting to
   today's behaviour so the nine ranked lists are unchanged. Product links via
   systembolagetProductUrl.

3. DATA
   - getGuideWines("new", "recommended").
   - "Today" = current date in Europe/Stockholm. Compare dates, not timestamps.
   - Section "Kommande släpp" / "Coming soon": product_launch_date > today. Group by date
     ascending. Group heading e.g. "Fredag 6 november" / "Friday 6 November".
   - Section "Nyss släppta" / "Just released": today - 60 days <= product_launch_date <=
     today. Group by date, newest first.
   - product_launch_date null or older than 60 days: not shown. Do not unpublish them.
   - Within a date: wine_score + score_adjust descending, then producer_name.
   - No rank numbers, no rank arrows, no "new/up/down" badges.
   - Hide an empty section. Both empty: "Inga nya naturviner just nu. Listan uppdateras
     när Systembolaget släpper nya viner." / "No new natural wines right now. The list
     updates when Systembolaget releases new wines."

4. CARD ADDITIONS
   - Date label: "Släpps 6 nov" / "Out 6 Nov" for upcoming, "Släpptes 9 okt" /
     "Released 9 Oct" for released.
   - "Begränsad mängd" / "Limited quantity" only when availability_state = 'limited'.
   - Assortment label as on the other lists ("Tillfälligt sortiment", "Webblansering").

5. COPY (article file)
   - H1: "Nya naturviner på Systembolaget" / "New natural wines at Systembolaget"
   - Title: "Nya naturviner på Systembolaget: tillfälligt sortiment {månad år}" /
     "New natural wines at Systembolaget: {Month Year} releases", month and year computed
     in Europe/Stockholm when metadata is generated.
   - Description: "Naturviner som släpps i Systembolagets tillfälliga sortiment och
     webblanseringar just nu, med datum, pris och vår kommentar." / "Natural wines released
     in Systembolaget's temporary range and web launches, with dates, prices and our notes."
   - Intro: "Här samlar vi naturviner som nyss släppts eller släpps snart i Systembolagets
     tillfälliga sortiment och webblanseringar. Viner försvinner från listan 60 dagar efter
     släppet eller när de tagit slut." English with the same meaning.
   - "Uppdaterad {datum}" / "Updated {date}" from max(synced_at) of the rows shown.
   - No urgency language: no "köp innan", "missa inte", countdowns.
   - FAQ (JSON-LD via the existing pattern):
     1. "Vad är Systembolagets tillfälliga sortiment?" → "Viner som säljs under en begränsad
        period och i begränsad mängd. När de tagit slut köps de normalt inte in igen."
     2. "När släpper Systembolaget nya viner?" → "Släppen i tillfälligt sortiment sker i
        regel på fredagar. Webblanseringar kan bara beställas via Systembolagets webbplats."
     English versions with the same meaning.

6. RENDERING
   Server Components. export const revalidate = 600, as on the other guide pages. The
   sections depend on today's date, so do not use force-static.

Rules:
- No new npm packages
- Do not touch components/ui/
- TypeScript strict, no any
- The nine ranked lists must render exactly as before

Expected result: with ids 155-169 published, the page shows Pietramore under 13 November,
Trebbiolo, Joiseph, Frontonio and Quarticello under 6 November in "Kommande släpp", and the
rest in "Nyss släppta" (Coulée de Serrant and Ostertag move there on 30 October).
```

---

## Prompt 3. Synkfixen

Synken har inte gått igenom sedan 15 oktober. Promote kördes manuellt 28 okt.

```
Fix two bugs in the Systembolaget sync. Reproduce from systembolaget_sync_log before fixing.

1. GUARD BASELINE
   The guard compares the new fetch count against the total row count of
   systembolaget_products (old_count). That total includes rows that are kept for 30 days
   after they disappear (consecutive_misses > 0), so the baseline grows while real fetches
   do not, and the guard blocks more and more runs (2026-10-19 and 2026-10-22, both
   ~5 % below a baseline of 15 451).
   - Compare against the number of rows seen in the latest successful sync:
     count(*) WHERE consecutive_misses = 0.
   - Log both numbers in systembolaget_sync_log (old_count = that baseline, plus the total
     in a new nullable column mirror_total). Add the column in a migration.
   - Keep the empty-staging guard exactly as is.

2. PROMOTE TIMEOUT
   systembolaget_promote_products() sets SET LOCAL statement_timeout = '120s' inside the
   function. That does not extend the timeout of the calling statement, so the RPC dies on
   the role's timeout (2026-10-26: "canceling statement due to statement timeout").
   - Pick one: call the promote through a connection whose role has a sufficient
     statement_timeout, or split the upsert into batches by product_number range inside
     the cron, each batch its own call. Recommend which one fits the repo and implement it.
   - Remove the misleading SET LOCAL line or keep it with a comment explaining it only
     covers statements inside the function.

Verify: run the sync manually, report wines fetched, baseline, outcome and duration.
```

---

## Efter deploy

- Publicera id 155 till 169 i /admin/systembolaget, eller be Claude göra det.
- Trebbiolo (id 143, röd lista) publiceras när den finns i butik 6 november.
- Listan behöver nya viner varje fredag. Med `launched_after` i sökverktyget kan Claude ta fram veckans kandidater på några minuter.
