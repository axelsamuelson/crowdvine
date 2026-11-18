# Cursor prompt: sparkling + pet nat category pages

Status: done in PR #274.

## Context
Data is already in place in `public.wines.tags` (done 2026-11-18):
- `sparkling` on every wine with `color = 'Sparkling'` (56 total, 10 live)
- `pet_nat` on 15 wines verified as pétillant naturel / méthode ancestrale (5 live)

Champagne, crémant, cava and traditional-method Vin de France wines have `sparkling` but not `pet_nat`.

Today the shop has no listing page for sparkling wine (`SHOP_FILTER_COLORS` in `lib/wine-shop-filter-categories.ts` has no Sparkling entry). `WineCategoryFilter.tags` is already supported end to end (`lib/crowdvine/products-data.ts` uses `q.contains("tags", [tag])`).

## Tasks

1. **Add two category pages per locale** in `lib/wine-categories.ts` (in the same style as `LONG_TAIL_WINE_CATEGORIES_SV/EN`):
   - SV `mousserande-vin` → canonical `/vin/mousserande-vin`, hreflang `sparkling-wine`, `filter: { tags: ["sparkling"] }`
   - EN `sparkling-wine` → canonical `/wine/sparkling-wine`, hreflang `sparkling-wine`, `filter: { tags: ["sparkling"] }`
   - SV `pet-nat` → canonical `/vin/pet-nat`, hreflang `pet-nat`, `filter: { tags: ["pet_nat"] }`
   - EN `pet-nat` → canonical `/wine/pet-nat`, hreflang `pet-nat`, `filter: { tags: ["pet_nat"] }`
   - Write h1/title/metaDescription/description. The pet nat page should have a `descriptionLink` to the existing guide (`/guider/vad-ar-pet-nat` and `/guides/what-is-pet-nat`). The sparkling page should link to the pet nat page.
   - No claims about specific wines or producers in the copy. Do not use em dashes.

2. **Hide the tags from the taste chips on the PDP.** They are category tags, not taste tags. Add `sparkling` and `pet_nat` to `HIDDEN_TASTE_TAGS` in `components/product/wine-enrichment-specs.tsx`. Check that `lib/taste-quiz/scoring.ts` does not pick them up as taste signals.

3. **Navigation and internal links.** Add both pages to the shop filter navigation or the explore links (`lib/wine-category-explore-links.ts`), wherever color/style categories are shown today. Link to `/vin/pet-nat` from the guides `vad-ar-pet-nat` and `basta-pet-nat-systembolaget` (and the EN equivalents).

4. **Sitemap.** Make sure the new slugs end up in `lib/sitemap-urls.ts` / `lib/sitemap-entries.ts` using the same logic as the other categories (including the live-count check, if there is one).

5. **Tests.** Add a test that the categories resolve via slug and that their filters return only wines with the tag. Run the existing tests.

## Do not
- Change `color` on any wine.
- Create new tags in code; the vocabulary is `sparkling` and `pet_nat`.
