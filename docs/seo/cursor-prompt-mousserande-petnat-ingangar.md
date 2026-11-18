# Cursor prompt: entry points to sparkling and pet nat pages

Supersedes `seo/cursor-prompt-mousserande-petnat-pills.md` (task 4 below covers it). Do not run both.

## Problem
`/vin/mousserande-vin`, `/vin/pet-nat`, `/wine/sparkling-wine` and `/wine/pet-nat` exist (PR #274) but have no natural entry point:
- The shop filter (`app/vin/components/shop-filters.tsx`, `mobile-filters.tsx`) has Color (Red, White, Orange, blends via `app/vin/hooks/use-available-colors.tsx`), Region, Farming and Producer. Nothing leads to sparkling or pet nat.
- `/vin` and `/wine` (`app/vin/components/main-shop-content.tsx`) only render `ShopRegionLinks` ("Utforska per region").
- The only links are explore links at the bottom of the color hubs (`lib/wine-category-explore-links.ts`) and inside the pet nat guides.
- On the PDP, the color spec in `components/product/wine-enrichment-specs.tsx` is plain text, even for sparkling wines.

Data: wines carry the tags `sparkling` (all `color = 'Sparkling'`) and `pet_nat`. The categories filter on `filter.tags`.

## Tasks

1. **Style pill row on the shop root.** Generalise `components/shop/shop-region-links.tsx` into a reusable pill-row component (e.g. `CategoryPillLinks` with `heading`, `links`, `ariaLabel`, `testId`). Keep `ShopRegionLinks` as a thin wrapper so nothing else changes. On `/vin` and `/wine`, render a second row above the region row:
   - Heading: "Utforska per stil" / "Explore by style"
   - Pills: Rött, Vitt, Orange, Mousserande, Pet nat (sv) → `/vin/rott-naturvin`, `/vin/vitt-naturvin`, `/vin/orange-naturvin`, `/vin/mousserande-vin`, `/vin/pet-nat`. EN: Red, White, Orange, Sparkling, Pet nat → the matching `/wine/...` canonicals.
   - Resolve hrefs and labels from `WINE_CATEGORIES_SV/EN` (canonical and short label), not hardcoded strings.
   - Hide a pill when its category has zero live wines, using the same live-count check the sitemap uses (`filterTags` / shop filter category availability).

2. **Sparkling in the shop filter.** Add a "Stil" / "Style" group to the desktop sidebar and the mobile filter sheet, placed directly after Color, with two options: Mousserande and Pet nat (EN: Sparkling, Pet nat).
   - In navigation mode (`shouldNavigateShopFilters`) each option is a real `<a href>` to the category canonical, the same way color options navigate to color hub URLs today.
   - The active option is selected when the current page is that category.
   - Show the same count style as the other groups. Hide an option with zero live wines.
   - Do not add Sparkling to the Color swatch list. Sparkling is a style, not a fourth colour, and pet nat can be white, rosé or red.

3. **Link from the PDP.** In `wine-enrichment-specs.tsx`, when the wine has the tag `sparkling`, render the color spec value as a link to the sparkling category for the locale. When it also has `pet_nat`, link to the pet nat category instead (more specific). Use the same link style as the grape links (`GrapeVarietyLinks`). Tags are already passed in as `tasteTags`; use the raw tags, not the filtered visible list.

4. **Pill instead of the underline link on the sparkling page.** On `/vin/mousserande-vin` and `/wine/sparkling-wine` the `descriptionLink` to pet nat renders as an underlined inline link. Render it with the new pill component instead (heading "Utforska" / "Explore"). Check whether any other category header renders `descriptionLink` with the `underline underline-offset-4 hover:text-stone-900` pattern, and migrate those too. List every page you changed.

5. **Color hubs: move the style links up.** On the color hubs (`rott-naturvin` and the others), the links to Mousserande and Pet nat currently sit only in the explore list at the bottom. Also add them as a pill row ("Fler stilar" / "More styles") in the header area, under the intro, using the same component.

## Constraints
- All links are crawlable `<a>`/`<Link>` with real hrefs. No `nofollow`, no JS-only navigation.
- Mobile: horizontal scroll with the same fade mask as the region row, tap targets `min-h-11`.
- No layout shift in the product grid.
- No em dashes in any copy.

## Acceptance
- From `/vin`, a visitor reaches `/vin/pet-nat` in one click, via either the style pills or the filter.
- The filter on every shop page (root, color hubs, region pages) shows Stil → Mousserande / Pet nat.
- A sparkling PDP links to its category.
- Tests: extend `lib/__tests__/sparkling-pet-nat-categories.test.ts` with a test that the style pills and filter options resolve to the right canonicals per locale and are hidden at zero live wines. Run `pnpm test`.
