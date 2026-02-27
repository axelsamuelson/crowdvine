# External prices – diagnostics

## How to run diagnose

**Endpoint:** `POST /api/admin/price-sources/diagnose`  
**Auth:** Admin only (same as other price-sources admin routes).

**Body:**
```json
{
  "wineId": "<uuid of a wine in your DB>",
  "sourceId": "<uuid of a price source in your DB>"
}
```

**Example (curl):**
```bash
curl -X POST https://your-app.com/api/admin/price-sources/diagnose \
  -H "Content-Type: application/json" \
  -H "Cookie: <your admin session cookie>" \
  -d '{"wineId":"...","sourceId":"..."}'
```

From the browser (admin logged in), you can use the Network tab or a small script that fetches wine/source IDs from your API and then calls the diagnose endpoint.

## What you get back (good output)

A JSON object with:

- **wine** – The wine used (id, wine_name, vintage, producer, etc.).
- **source** – The price source (name, base_url, slug, etc.).
- **error** – Set only if wine or source was not found.
- **requests** – Array of every HTTP request made:
  - `requestUrl`, `status`, `contentType`, `finalUrl`, `bodyByteLength`, `bodySnippet`, `botBlockDetected`
  - First entries are search/suggest requests; then one (or two, if .js then HTML) per candidate PDP.
- **candidateCount** – Number of candidate PDP URLs tried.
- **candidates** – For each candidate:
  - `pdpUrl`, `fetchStatus`, `fetchByteLength`, `fetchSnippet`, `botBlockDetected`
  - `extracted` – Parsed offer (title, price, currency, available, vendor, size) or `null` if parse failed.
  - `matchScore`, `matchBreakdown` (producerScore, wineNameScore, vintageScore, vintageOur/Pdp, sizeOur/Pdp)
  - `decision`: `"accepted"` or `"rejected"`
  - `rejectReason`: `null` or one of `vintage_mismatch`, `size_mismatch`, `below_threshold`, `no_offer_extracted`, or an error message.
- **thresholdUsed** – Match threshold used (e.g. 0.75 or value from `source.config.matchThreshold`).

## What “good” looks like

- **requests:** At least one `suggest.json` request with `status: 200` and a non-empty `bodySnippet` (product suggestions). No `botBlockDetected: true` on the main responses.
- **candidateCount:** Greater than 0 (candidates discovered).
- **candidates:** At least one entry with:
  - `extracted` non-null (title, price when present).
  - `decision: "accepted"` and `rejectReason: null` → that candidate would be written to `external_offers`.

If you see **candidateCount: 0**, discovery failed (suggest.json returned no products or non-200; then sitemap may not have been used or had no product URLs). Check `requests` for the suggest URL and response status/snippet.

If candidates exist but all have **decision: "rejected"**, check `rejectReason` and `matchBreakdown` (e.g. vintage or size mismatch, or score below threshold).

## Reproducing one match (staging/dev)

1. Create or pick a **test wine** that you know exists at morenaturalwine.com or primalwine.com (e.g. same producer + name + vintage).
2. Ensure a **price source** exists for that store (base_url, slug; optional search_url_template). No need to set sitemap_url for suggest-based discovery.
3. Call **POST /api/admin/price-sources/diagnose** with that wine’s ID and the source’s ID.
4. Inspect the response: confirm at least one candidate with `decision: "accepted"`.
5. Run **POST /api/admin/price-sources/refresh** with body `{ "wineId": "<same wine id>" }` (and optionally one source). Check that `external_offers` has one row for that wine + source.

If diagnose shows an accepted candidate but refresh does not write a row, check server logs and that the same threshold and source config are used (e.g. no temporary config override).
