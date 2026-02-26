# External competitor offers – debug & harden plan

## Goal
Get at least 2 sources (morenaturalwine.com, primalwine.com) to produce candidate PDPs, extract offer data, and persist at least one match for a test wine.

## Current state
- **Candidate discovery:** HTML search page + regex for `href="/products/..."`; fallback to sitemap (in-memory). Many Shopify stores use custom search pages or JS rendering → 0 candidates.
- **PDP extraction:** JSON-LD then regex HTML fallback. No `.js` product endpoint.
- **Matching:** Title-only with producer/wine/vintage weights; no vendor/size; no explicit reject rules.
- **No diagnostics:** No way to see why a run produced 0 hits.

## Changes (prioritized)

### 1. Diagnostics (first)
- **`lib/external-prices/diagnose.ts`**  
  - `runDiagnostic(wineId, sourceId)` runs one wine + one source.  
  - Uses a fetch recorder (injected via `fetch-with-retries`) to capture: request URL, status, content-type, final URL, body length, safe body snippet/hash.  
  - Runs: search/candidates → for each candidate fetchOffer → match.  
  - Output: `DiagnosticOutput` with search request(s), candidate count, per-candidate: PDP fetch status, extracted fields, match score breakdown, decision (accepted/rejected + reason).
- **`POST /api/admin/price-sources/diagnose`**  
  - Body: `{ wineId, sourceId }`. Returns JSON diagnostic output.
- **`lib/external-prices/fetch-with-retries.ts`**  
  - Optional diagnostic recorder callback invoked on each fetch with request/response metadata and body snippet.

### 2. Candidate discovery (Shopify)
- **Query-pack** (`lib/external-prices/query-pack.ts`):  
  - `buildQueryPack(wine)` returns multiple search strings:  
    (1) producer + wine_name + vintage, (2) producer + wine_name, (3) wine_name + vintage, (4) producer + vintage, (5) wine_name.  
  - Union + dedupe candidate URLs.
- **Predictive search** in `lib/external-prices/adapters/shopify-like.ts`:  
  - Primary: `GET {base_url}/search/suggest.json?q={query}&resources[type]=product&resources[limit]=10`.  
  - Run for each query in pack; merge and dedupe product URLs.  
  - Parse JSON: `resources.results.products` → product URL (or handle + base).
- **Sitemap fallback:**  
  - If suggest returns non-200 or 0 candidates, fetch `{base_url}/sitemap.xml`, resolve product sitemap(s), extract `/products/` URLs.  
  - **Persistent cache:** New table `sitemap_product_urls` (source_id, url, fetched_at) or reuse a cache table; TTL 24h. Use DB (no Redis requirement).

### 3. PDP extraction (Shopify)
- **Order of attempts:**  
  1. **Product JSON:** `GET {pdpUrl}.js` or `GET {base}/products/{handle}.js` → structured product with vendor, variants (price, availability, title, option1 for size).  
  2. JSON-LD in HTML (existing).  
  3. HTML with **cheerio** (add dependency): selectors for title, price, availability; no raw regex for body.
- **NormalizedOffer** (types): add optional `vendor?: string`, `size?: string` for matching and diagnostics.
- **Price logic:** Prefer first variant price; if range, store min or mark; handle compare_at if present.

### 4. Matching
- **Multi-signal:** Use vendor/producer, wine_name, vintage, size (when present).  
- **Reject rules:**  
  - If both have vintage and they differ → reject.  
  - If both have size and they differ (e.g. 750 vs 1500) → reject.  
- **Threshold:** Default 0.75; configurable per source via `source.config.matchThreshold`.  
- **`scoreMatchWithBreakdown`** (or extend return): return `{ score, breakdown, rejectReason? }` for diagnostics and tests.

### 5. Networking
- **Headers:** Add `Accept-Language: en-US,en;q=0.9`, keep `Accept` and `User-Agent`.  
- **Bot-block detection:** After fetch, check body for Cloudflare challenge, “enable javascript”, captcha patterns; set a flag in response or diagnostic (e.g. `botBlockDetected: true`).

### 6. Service integration
- **Refresh for one source:** `refreshOffersForWine(wineId, { sourceId?: string })` to run only one source when provided.  
- **Match:** Use new `evaluateMatch(wine, offer, source)` that applies reject rules and returns accept/reject + reason; use threshold from `source.config?.matchThreshold ?? 0.75`.  
- **Upsert:** Unchanged; only accept when evaluateMatch says accept.

### 7. Tests
- **Query-pack:** `buildQueryPack` returns expected strings for a given wine.  
- **Suggest JSON:** Parse sample `suggest.json` → candidate URLs.  
- **Product .js:** Parse sample Shopify product JSON → normalized offer (title, vendor, price, size).  
- **Match:** Score with vintage/size reject rules; test accepted/rejected cases.  
- **Diagnostics:** Schema / snapshot test for diagnostic output shape.

### 8. Docs
- **README/notes** (e.g. in `docs/EXTERNAL_PRICES_DIAGNOSTICS.md`): how to run diagnose (POST body, example), what “good output” looks like, how to add a test wine and run until one match is reproduced.

## File touch list
- New: `lib/external-prices/diagnose.ts`, `lib/external-prices/query-pack.ts`, `docs/EXTERNAL_PRICES_PLAN.md`, `docs/EXTERNAL_PRICES_DIAGNOSTICS.md`
- New: `app/api/admin/price-sources/diagnose/route.ts`
- New migration: `sitemap_product_urls` (if we persist sitemap cache in DB)
- Modify: `lib/external-prices/fetch-with-retries.ts` (recorder, headers, bot-block)
- Modify: `lib/external-prices/adapters/shopify-like.ts` (suggest.json, query-pack, .js PDP, sitemap from DB, cheerio fallback)
- Modify: `lib/external-prices/match.ts` (breakdown, reject rules, threshold from options)
- Modify: `lib/external-prices/types.ts` (NormalizedOffer vendor/size)
- Modify: `lib/external-prices/service.ts` (single-source refresh, evaluateMatch)
- Modify: `lib/external-prices/normalize.ts` (extractSize used in match)
- New tests: `lib/external-prices/__tests__/query-pack.test.ts`, `shopify-suggest.test.ts`, `shopify-product-js.test.ts`, `match-reject.test.ts`, `diagnose-schema.test.ts`
- Add dependency: `cheerio`
