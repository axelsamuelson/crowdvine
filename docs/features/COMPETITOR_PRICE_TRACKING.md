# Competitor price + PDP link tracking

This feature tracks competitor prices and product page (PDP) links for wines in our catalog. It is a small “Prisjakt” scoped to our wines and a curated list of natural wine e-commerce sites (e.g. morenaturalwine.com, primalwine.com).

## Setup

Run the migration that creates the tables (e.g. in Supabase SQL editor or via your migration runner): `migrations/080_competitor_price_tracking.sql`

## Data model

- **price_sources** – Competitor shops we track. Fields: `name`, `slug`, `base_url`, `search_url_template`, `adapter_type` (e.g. `shopify`), `is_active`, `rate_limit_delay_ms`, optional `config` (JSON).
- **external_offers** – One row per wine + source: `pdp_url`, `price_amount`, `currency`, `available`, `title_raw`, `match_confidence` (0–1), `last_fetched_at`. Only the latest snapshot is stored per wine+source; history can be added later.

## How to add a new source

1. **Insert a row in `price_sources`** (via Admin API or Supabase):
   - `name`: Display name (e.g. "More Natural Wine").
   - `slug`: Unique id (e.g. `morenaturalwine`).
   - `base_url`: Root URL (e.g. `https://morenaturalwine.com`).
   - `search_url_template`: Optional. Use `{query}` for the search term and `{base_url}` for the base URL. Example: `{base_url}/search?q={query}`.
   - `adapter_type`: `shopify` for Shopify-like sites (default). Other types (e.g. `woocommerce`) require a new adapter in `lib/external-prices/adapters/`.
   - `is_active`: `true`.
   - `rate_limit_delay_ms`: Delay in ms between requests to this source (e.g. 2000).

2. **If the site is not Shopify-like**, add a new adapter in `lib/external-prices/adapters/` implementing `SourceAdapter` (searchCandidates, fetchOffer) and register it in `adapters/index.ts` under a new `adapter_type`.

## How to run refresh

- **One wine**:  
  `POST /api/admin/price-sources/refresh`  
  Body: `{ "wineId": "<wine-uuid>" }`  
  (Requires admin auth.)

- **All wines**:  
  `POST /api/admin/price-sources/refresh`  
  Body: `{}`  
  Optional: `{ "batchSize": 50 }` to limit how many wines are processed in one run.

- **Scheduling**: Call the refresh endpoint from Vercel Cron or an external cron (e.g. daily). See “Scheduling” below.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/price-sources` | List sources (query `?active=true` for active only). |
| POST | `/api/admin/price-sources` | Create source (body: name, slug, base_url, …). |
| GET | `/api/admin/price-sources/[id]` | Get one source. |
| PATCH | `/api/admin/price-sources/[id]` | Update source. |
| DELETE | `/api/admin/price-sources/[id]` | Delete source. |
| POST | `/api/admin/price-sources/refresh` | Trigger refresh (body: optional `wineId`, optional `batchSize`). |
| GET | `/api/admin/wines/[id]/offers` | Get competitor offers for a wine (sorted by price). |

All require admin authentication.

## Matching and confidence

- For each wine we search each active source for candidate PDPs, fetch the page, and extract title/price/availability.
- We normalize our wine (name, producer, vintage) and the PDP title, then score the match (producer + name + vintage). Score is 0–1.
- Only offers with score ≥ threshold (default 0.6) are stored. The best candidate per source is kept. `match_confidence` is stored on each offer.

## Code layout

- **lib/external-prices/** – Types, adapters, normalize, match, fetch-with-retries, db, service.
- **app/api/admin/price-sources/** – CRUD and refresh routes.
- **app/api/admin/wines/[id]/offers/** – GET offers for a wine.
- **migrations/080_competitor_price_tracking.sql** – Tables and RLS.

## Scheduling

To run refresh on a schedule (e.g. daily):

1. **Vercel Cron**: In `vercel.json` add a cron that calls `POST /api/admin/price-sources/refresh` with a secret header or API key, and ensure the route validates it when called from cron (e.g. check `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`).
2. **External cron**: Use GitHub Actions or another scheduler to send the same POST request with admin credentials or a shared secret.

Example (Vercel) — add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/admin/price-sources/refresh", "schedule": "0 4 * * *" }]
}
```

Ensure the refresh route allows server-to-server calls: either use the same admin session (e.g. cookie) from a logged-in cron runner, or add optional support for a `CRON_SECRET` env var so that requests with `Authorization: Bearer <CRON_SECRET>` are accepted without session (implement in the refresh route if you use this).
