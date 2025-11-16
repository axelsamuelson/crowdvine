## Wines admin improvements plan

1. **Inventory current screens**
   - `/admin/wines` list uses basic table; lacks new admin shell & filtering.
   - `/admin/wines/new` (and edit) rely on legacy `WineForm`.

2. **Requirements**
   - Align list + form with new admin layout (AdminPageShell, stat cards).
   - Add fields:
     - `info_section_text` (text below white box on PDP).
     - `alcohol_percentage` (displayed like grape varieties pill).
   - Show alcohol info on PDP + API responses.
   - Remove spinner controls on number inputs (pricing UX).

3. **Implementation outline**
   - Create SQL guide `docs/deployment/ADD_WINE_FIELDS.sql`.
   - Extend Supabase actions (`lib/actions/wines.ts`) + API routes to read/write new columns.
   - Refresh `/admin/wines` UI (cards for stats, better table, search).
   - Modernize `WineForm` (field groups, new inputs, helper copy) and reuse for edit.
   - Update PDP + Shopify adapters to consume `info_section_text` + `alcohol_percentage`.
   - Add global CSS to hide number spinners + ensure decimal keypad on mobile.

