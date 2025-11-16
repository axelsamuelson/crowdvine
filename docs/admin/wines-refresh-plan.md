## Wines & PDP Enhancements Plan

1. **Admin Wines list refresh**
   - Wrap `/admin/wines/page.tsx` with `AdminPageShell`.
   - Add summary stats (count by color, last-updated) + search/filter affordances.
   - Modernize table rows (cards, consistent badges, inline actions).

2. **Wine form & new fields**
   - Update `components/admin/wine-form.tsx` to include:
     - Story text (`info_section_text`) for PDP copy under white box.
     - Alcohol percentage input (displayed later in PDP).
   - Improve layout (sections, helper text) and ensure `/admin/wines/new` uses new shell.

3. **Data layer**
   - Extend `lib/actions/wines.ts` interfaces & queries for new columns.
   - Update `/app/api/crowdvine/products...` routes so Shopify-facing product payload carries `info_section_text` + `alcohol_percentage`.
   - Document DB changes via `docs/deployment/ADD_WINE_FIELDS.sql`.

4. **PDP & listing consumption**
   - Show new story text under white box (fallback to existing description HTML).
   - Surface alcohol pill alongside grape varieties (use existing variant selector styling).

5. **Pricing input UX**
   - Remove number steppers via global CSS + add `inputMode="decimal"` on cost/margin fields for easier typing.

