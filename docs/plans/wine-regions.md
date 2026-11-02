# Wine regions — implementation plan

Plan-only. No feature code in this PR. Design references: `docs/plans/region-mockups/` (PLP chips, mobile filter sheet, `/region/loire`). Product-card redesign is **out of scope** (separate PR).

## Goals

1. Canonical **wine region** on product data (allowlisted French regions).
2. **Region filter** on the shop PLP (`?region=loire,jura`), UI per creative-director mockups.
3. **Indexable region landing pages** (SV + EN) with SEO, sitemap, and marketing-owned copy slots (no final copy in engineering PRs).

---

## Current state (investigation)

### Schema

| Table | Column | Live type | Role today |
| --- | --- | --- | --- |
| `producers` | `region` | `text NOT NULL` | Soft allowlist via `regions` table (`078_countries_and_regions_reference.sql`); **no FK/CHECK**. Admin Select + PLP `filterRegion` join on this. |
| `producers` | `subregion` | `text NULL` | Free text (maps / locality). |
| `wines` | `region` | `text NULL` | Exists in prod; **not** created in numbered migrations (comment in `090_wines_specs.sql`: “Region comes from producers.region”). Admin wine form does **not** edit it. |
| `wines` | `appellation` | `text NULL` | Separate; keep. |
| `regions` | `value` PK | reference | UI list includes English labels (`Burgundy`, `South West France`) that diverge from live data (`Bourgogne`, `Sud-Ouest`). |
| shipping | `shipping_region_id` | uuid | Logistics only — **do not** conflate with wine region. |

`lib/catalog-mappers.ts` already selects `wines.region` and can patch it; storefront PDP/PLP still use **`producers.region`**.

### Live catalog snapshot (prod, queried during planning)

Producer `region` values in use include Languedoc, Loire, Vallée du Rhône, Corse, Bourgogne, Sud-Ouest, Roussillon, Bordeaux, Champagne, Beaujolais, Jura, Provence, Alsace, Aveyron, plus non-FR outliers.

**Live wines × mapped allowlist** (after synonym map below):

| Mapped region | Live wines (wine + producer `is_live`) |
| --- | ---: |
| Languedoc | 91 |
| Loire | 8 |
| Beaujolais | 2 |
| Bourgogne | 1 |
| Alsace | 1 |
| Rhône (from Vallée du Rhône) | 1 |
| Roussillon | 1 |
| Jura / Champagne / Sud-Ouest | 0 |

**Mismatch rows** (`wines.region` ≠ `producers.region`):

| Handle | Wine region | Producer region | Live? |
| --- | --- | --- | --- |
| `braconnage-2024` | Auvergne | Loire (Henri Chauvet) | wine live; **producer not live** |
| `domaine-robert-denogent-cuv-e-jules-chauvet-2023-csg` | Beaujolais | Bourgogne | not live |

### PLP filters today

- Query params: `fcolor`, `fgrape`, `ffarming`, `fsource`, `q`, `qscope`, `producers`, `sort`.
- Path-based color/farming/grape hubs under `/vin/*` and `/wine/*`.
- Server filter helper `applyShopUrlFilters` — **no `region` yet**.
- Data layer already supports `filterRegion` → `eq("producers.region", …)` in `lib/crowdvine/products-data.ts`, but **no shop category** sets it (legacy Languedoc shop PLPs were removed; middleware 301s those slugs).
- Root PLP metadata already: **canonical = bare `/vin` or `/wine`**, and `shopSearchParamsRobots` → `noindex,follow` whenever any query param is present. Region filter must keep that behaviour.

### Why `/region/languedoc` → `/access-request`

There is **no** `app/region/` route yet. Unauthenticated hits to `/region/*` fail the middleware public allowlist:

- Gate: `lib/auth/public-paths.ts` → `PUBLIC_PATH_PREFIXES` (no `/region` or `/regions`).
- Effect: `middleware.ts` treats the path as private → redirect to `/access-request?redirectedFrom=…`.

This is **not** a `next.config` redirect (those only cover `/languedoc` → guide). **Fix in the landing-page PR:** add `/region` and `/regions` to `PUBLIC_PATH_PREFIXES` (and `localeFromShopPath` / locale switcher helpers). Treat region pages like `/producenter` / `/guider` for browse access.

### URL locale pattern today

Path-prefix locale (no `/sv`/`/en` under shop): `/produkt`↔`/product`, `/producenter`↔`/producers`, `/vin`↔`/wine`, `/guider`↔`/guides`.

---

## Allowlist, slugs, synonyms

### Canonical region values (DB / display FR names)

`Languedoc`, `Beaujolais`, `Loire`, `Bourgogne`, `Jura`, `Champagne`, `Rhône`, `Roussillon`, `Alsace`, `Sud-Ouest`

### URL slugs (French, **same in SV and EN**)

| Value | Slug |
| --- | --- |
| Languedoc | `languedoc` |
| Beaujolais | `beaujolais` |
| Loire | `loire` |
| Bourgogne | `bourgogne` |
| Jura | `jura` |
| Champagne | `champagne` |
| Rhône | `rhone` (ASCII; no ô in URL) |
| Roussillon | `roussillon` |
| Alsace | `alsace` |
| Sud-Ouest | `sud-ouest` |

### Backfill synonym map → allowlist

| Existing `producers.region` / `wines.region` | Map to |
| --- | --- |
| Exact allowlist string | itself |
| `Vallée du Rhône`, `Rhone`, `Rhone Valley` | `Rhône` |
| `Burgundy` | `Bourgogne` |
| `South West France`, `Sud Ouest` | `Sud-Ouest` |
| **`Aveyron`** | **`Sud-Ouest`** (marketing) |

### Wines / producers that **cannot** be derived into the allowlist

Leave `wines.region` **NULL** (out of filter + out of region landings) until ops assigns manually. Do **not** invent mappings.

**Live catalog (wine `is_live` + producer `is_live`) — cannot derive:**

| Wine | Handle | Current region | Producer |
| --- | --- | --- | --- |
| Petit Clos 2023 | `petit-clos-2023` | Corse | Clos Canarelli |
| Roucas 2023 | `roucas-2023` | Provence | Domaine Hauvette |
| Bugey Cerdon Méthode Ancestrale 2023 | `bugey-cerdon-m-thode-ancestrale-2023` | Bugey | Domaine Renardat-Fache |

**Also note:** many non-live rows (Bordeaux, Corse, Provence, Savoie, non-FR, etc.) will stay NULL after backfill. **Aveyron** producers/wines → `Sud-Ouest` (none currently live).

**Open ops decision (document in PR2, do not silently guess):** `braconnage-2024` wine region `Auvergne` vs producer `Loire` — prefer producer mapping to `Loire` when promoting, or keep NULL until confirmed.

---

## Proposed data model

**SSOT for shop filter + region pages: `wines.region`** (nullable, allowlisted or NULL).

Rationale: product-level field as requested; supports rare producer/wine mismatches; PLP cards/filters read wine data; producer `region` remains for admin geography / maps and can be kept in sync on save.

### Migration `272_wine_regions_allowlist.sql` (next free number as of this plan: **272**; re-check `migrations/` on `main` before merge)

1. Document / ensure `wines.region` column exists (`ADD COLUMN IF NOT EXISTS`).
2. Upsert `regions` reference rows for the 10 FR values (labels = French names); optionally mark `filterable` or replace obsolete English FR rows (`Burgundy` → prefer `Bourgogne`, etc.) without breaking admin mid-deploy — prefer additive upsert + admin UI switch to new values in same PR.
3. Backfill:
   - `UPDATE wines SET region = <mapped> FROM producers …` using synonym map (producer region primary; if wine already matches allowlist and producer differs, **keep wine value** only when it is already allowlisted — see Denogent Beaujolais case).
   - Map Aveyron → Sud-Ouest on both producers (optional sync) and wines.
   - Set `wines.region = NULL` where unmappable.
4. `CHECK (region IS NULL OR region IN (...))` on `wines.region`.
5. Index: e.g. `(region) WHERE region IS NOT NULL AND is_live` (or partial useful for PLP counts).
6. **Do not** hard-break `producers.region` in the same migration if admin still has free-text outliers; follow-up can constrain producers to the same allowlist + NULL/Other.

### App write paths (same PR as migration or immediately after)

- Admin wine create/update: region Select (allowlist); default from producer on create; optional override.
- On producer region change: offer / auto-update child wines where `wines.region` was equal to old producer region (avoid clobbering intentional overrides).
- MCP `create_wine` / `update_wine`: accept allowlisted `region`.
- Keep `revalidateWineStorefrontCaches` on saves (extend paths in landing PR).

---

## PLP region filter (mockups)

### Behaviour

- Param: **`region`** = comma-separated **slugs**, e.g. `/vin?region=loire,jura` (order: sort alphabetically when writing URLs to avoid dupes; accept any order when reading).
- Multi-select OR semantics (wine matches if its region slug ∈ selected set).
- Desktop: horizontal chip row under H1 (“Region” label + chips + “Rensa”), per `plp_5266` / 1440 mockup.
- Mobile: summary “Filter · Region (N)” opens bottom sheet with checklist + “Visa N viner”, per `plp-sheet_5348`.
- Labels: French names; Sud-Ouest display **“Sydvästra Frankrike (Sud-Ouest)”** in SV UI (mockup); EN propose **“South West France (Sud-Ouest)”** or keep French — confirm with marketing in copy pass (engineering ships i18n keys, not final marketing prose for landings).
- Only show chips for regions that currently have ≥1 **live** wine (or show all allowlisted disabled — prefer **only regions with live stock** to match “live products” ethos).
- Filter applies on `/vin` and `/wine` roots; interaction with path hubs (`/vin/rott-naturvin` etc.): apply `region` as additional client/server filter on the already category-filtered set (same as `fgrape` on hubs if applicable).
- **Do not change product card layout/style** in this workstream.

### SEO (marketing)

- `?region=…` **never indexed separately**.
- **Canonical = the bare PLP** (`/vin` or `/wine`) — already how root shop metadata works; keep it.
- Robots: existing `shopSearchParamsRobots` → `noindex,follow` when params present.

### Implementation sketch

- Shared slug↔value map: `lib/wine-regions.ts` (constants, parse/serialize `region` query, labels).
- `applyShopUrlFilters` + `countActiveShopFilters` + mobile filter count: include `region` (split commas — today `arrayParam` does **not** split; producers-style split required).
- Prefer filtering on **`wines.region`** once backfilled; until then temporary bridge from producer region is unacceptable in final AC — ship filter PR **after** or **with** backfill.
- UI: new `region-filter.tsx`; wire into `shop-filters.tsx`, `mobile-filters.tsx` / sheet; messages keys under `shop.*`.

### CRO conflict surface (files likely touched)

Coordinate with CRO owner before merge:

**Routes / layout**

- `app/vin/page.tsx`, `app/wine/page.tsx`
- `app/vin/[collection]/page.tsx`, `app/wine/[category]/page.tsx` (if region combines with hubs)
- `app/vin/layout.tsx`, `app/wine/layout.tsx`
- `components/shop/shop-layout-shell.tsx`, `products-provider.tsx`, `shop-layout-client.tsx`

**Filter UI**

- `app/vin/components/shop-filters.tsx`
- `app/vin/components/mobile-filters.tsx` (+ sheet patterns)
- `app/vin/components/color-filter.tsx`, `farming-filter.tsx`, `grapes-filter.tsx`, `category-filter.tsx`, `competitor-filter.tsx` (neighbours only)
- `app/vin/components/shop-filter-*.tsx`, `results-controls.tsx`, `main-shop-content.tsx`
- `app/vin/hooks/use-filter-count.tsx`

**Lib**

- `lib/shop/apply-shop-url-filters.ts`
- `lib/shop/filter-navigation.ts`
- `lib/shop/filter-count-server.ts`
- `lib/shop/shop-results-count-server.ts`
- `lib/shop/gate-shop-filter-href.ts`
- `lib/shop/cached-shop-products.ts`
- `lib/crowdvine/products-data.ts`
- `lib/map-product-data-to-shop-product.ts` (expose region for filter; **not** card chrome)
- `messages/sv.json`, `messages/en.json`
- Tests: `lib/__tests__/shop-filter-*.ts`, `filter-navigation-*.ts`, etc.

**Out of scope / do not touch for region filter**

- `app/vin/components/product-card/**` (card PR)

---

## Region landing pages

### URL scheme

Consistent with `/produkt`↔`/product` and `/producenter`↔`/producers`, mockup URL `/region/loire`, and marketing “French slugs in both languages”:

| Locale | Pattern | Example |
| --- | --- | --- |
| SV | `/region/{slug}` | `/region/loire` |
| EN | `/regions/{slug}` | `/regions/loire` |

Same French slug; **hreflang** pairs SV↔EN; `x-default` → EN (same as product/producer).

Wire: `localized-routes.ts`, `shop-path-locale.ts`, locale switcher, `public-paths.ts` (`/region`, `/regions`).

### Page content (structure from mockups — **no final copy**)

Sections:

1. Breadcrumb: Regioner / {Name} (SV) · Regions / {Name} (EN)
2. H1 + short intro + CTA → `/vin?region={slug}` / `/wine?region={slug}`
3. “Vad kännetecknar…?” short answer (AEO) + fact list: Läge (marketing), Druvor / Stilar / Producent count (**derived from live wines**)
4. Producer list (live producers in region)
5. Wine grid (reuse existing shop card component as-is; no card redesign)

### Copy storage (proposal)

**In-repo typed module** `lib/region-content/{slug}.ts` (or single `lib/region-content.ts` map), mirrored after `lib/wine-category-content.ts` / guides articles:

- Keys per locale: `metaTitle`, `metaDescription`, `h1`, `intro`, `characteristicsHeading`, `characteristicsBody`, `locationBlurb`
- Empty string / `null` until marketing delivers — page can ship with structured placeholders **only in non-prod** or behind “hasCopy” gate; **do not invent final marketing copy in agent PRs**
- Derived fields never stored: grapes, styles, producer count, wine list

Alternative rejected for v1: new Supabase table — slower for bilingual SEO iteration; revisit if non-devs must edit in admin.

### Indexability rules (marketing + proposal)

| Condition | Behaviour |
| --- | --- |
| Unknown slug | **404** |
| 0 live wines (`wines.is_live` ∧ `producers.is_live`, `wines.region` = value) | **404** + omit from sitemap |
| Live wines &lt; index threshold | Serve page, **`noindex,follow`**, omit from sitemap (unless per-region override) |
| Live wines ≥ threshold (and copy optional — see AC) | Indexable: unique title/meta, canonical, hreflang, ItemList + BreadcrumbList JSON-LD, sitemap |

**Proposed default threshold:** `minLiveWinesToIndex = 3`, configurable **per region** in `lib/wine-regions.ts` (e.g. `{ alsace: 2, jura: 2 }` overrides).

Rationale: with current live counts only Languedoc (91) and Loire (8) clear a threshold of 3; thin regions (Alsace ~1 live wine / ~4 producers in catalog, Jura 0 live) stay crawlable-but-noindex or 404 until assortment grows. Marketing can lower overrides when they want early indexing.

Also respect existing storefront gates: same `is_live` rules as shop/sitemap (`lib/sitemap-urls.ts` / products-data). Prefer **404 over thin index** when count is 0.

### Caching

Extend `revalidateWineStorefrontCaches` (`lib/crowdvine/revalidate-wine-storefront.ts`) to `revalidatePath` `/region/{slug}` and `/regions/{slug}` for affected regions (from wine region or producer mapping). Tag-based shop cache already covers PLP data; region pages should use the same product cache tag or a dedicated `region-pages` tag if separately cached.

### SEO checklist per indexable page

- [ ] `metadata.title` / `description` from content module
- [ ] `alternates.canonical` self
- [ ] `alternates.languages` sv + en + x-default
- [ ] robots indexable only when threshold met
- [ ] JSON-LD `BreadcrumbList` + `ItemList` (wines)
- [ ] Sitemap entries only for indexable pair
- [ ] Public middleware allowlist

---

## Suggested PR split (one concern each)

| PR | Scope | Notes |
| --- | ---: | --- |
| **0** | This plan + mockup HTML refs | Docs only |
| **1** | Migration `272_…` + backfill + CHECK + `lib/wine-regions.ts` constants + admin/MCP write path for `wines.region` | No storefront UI |
| **2** | PLP `?region=` filter UI + `applyShopUrlFilters` (mockups; **no card changes**) | High CRO conflict — rebase early; list files above |
| **3** | `/region` + `/regions` pages, public-paths, hreflang/canonical/JSON-LD/sitemap, cache revalidate, empty content slots | Blocked on PR1 data; copy left empty for marketing |
| **4** | Marketing copy fill (content module only) | Humans / marketing; still no product behaviour change |

Optional later: constrain `producers.region` to the same allowlist; redirect legacy guide confusion only if marketing asks (keep `/guider/naturvin-languedoc`).

---

## Acceptance criteria

### PR1 — data

- [ ] New numbered migration under `migrations/` only (next free integer at merge time).
- [ ] Every wine either has allowlisted `wines.region` or `NULL`.
- [ ] Synonyms applied: Vallée du Rhône→Rhône, Aveyron→Sud-Ouest, etc.
- [ ] Live unmappable wines listed above remain `NULL` (Corse / Provence / Bugey).
- [ ] CHECK prevents non-allowlist non-null values.
- [ ] Admin can set wine region; create defaults from producer when mappable.
- [ ] Tests for mapper / synonym / slug helpers.

### PR2 — PLP filter

- [ ] `/vin?region=loire,jura` and `/wine?region=loire,jura` filter live wines by `wines.region`.
- [ ] Desktop chips + mobile sheet match mockup structure (tokens/spacing per existing shop UI).
- [ ] Clear (“Rensa”) removes `region` param.
- [ ] Filtered URLs: `noindex,follow`; canonical remains `/vin` or `/wine`.
- [ ] Product card components unchanged.
- [ ] Conflict review against concurrent CRO/PLP PRs using the file list.

### PR3 — region pages

- [ ] SV `/region/{slug}` and EN `/regions/{slug}` public (no access-request redirect).
- [ ] French slugs only; hreflang linked.
- [ ] 0 live wines → 404; thin &lt; threshold → noindex + not in sitemap; ≥ threshold → indexable + sitemap.
- [ ] Per-region threshold overrides work.
- [ ] Title, meta, canonical, ItemList, BreadcrumbList present for indexable pages.
- [ ] `revalidateWineStorefrontCaches` busts region paths.
- [ ] Copy fields exist but contain **no invented final marketing copy**.

### PR4 — copy

- [ ] Marketing-provided SV/EN text only; fact-check before indexable launch for thin regions they force-index.

---

## Open questions (need human confirm, non-blocking for PR1)

1. EN Sud-Ouest chip label wording.
2. Exact per-region index overrides at launch (default 3 OK?).
3. Whether producer rows should be rewritten to allowlist in PR1 or only wines.
4. Auvergne (`braconnage-2024`) assignment when that producer is live.
5. CTA on region page: always query PLP vs also deep-link a future dedicated filtered path (recommend query PLP).
