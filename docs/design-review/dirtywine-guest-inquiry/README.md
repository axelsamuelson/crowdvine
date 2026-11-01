# Dirtywine guest B2B inquiry — design review

Axel (2026-11-01): guests may submit `/b2b/inquiry` without membership.  
Inès follow-up: field-level validation, Ort, optional labels, confirmation summary + account offer.  
Inès R2: 40×40 bottle thumbs (cart image), flush Totalt, real Dirtywine header logo in fixtures, date field `sv-SE`.

## Screenshots

Geist + dirtywine grey (`hsl(223.81 0% 94%)`) + real Dirtywine header logo. Fixtures mirror React UI.

| File | State | Width |
| --- | --- | --- |
| `form-guest-empty-{390,1440}.png` | Empty form | 390 / 1440 |
| `form-validation-errors-{390,1440}.png` | Per-field errors + summary | 390 / 1440 |
| `confirmation-account-offer-{390,1440}.png` | Confirmation + account offer | 390 / 1440 |
| `date-sv-SE-390.png` | Date field with Playwright locale `sv-SE` (åååå-mm-dd) | 390 |

## Header note (Inès c)

`/b2b/inquiry` is **not** in `shouldHideHeader` — production Dirtywine uses the same site header + logo as the rest of dirtywine.se. Earlier screenshots used a placeholder “MENY / DIRTY WINE” text header in the HTML fixtures only; fixtures now use the real logo SVG.

## Migrations (do not apply to production from this PR)

- `261_b2b_inquiries.sql` — base table
- `262_b2b_inquiries_guest_user.sql` — nullable `user_id`, claim token, owner SELECT RLS
- `263_b2b_inquiries_city.sql` — required `city` (Ort)
