# Dirtywine guest B2B inquiry — design review

Axel (2026-11-01): guests may submit `/b2b/inquiry` without membership.  
Inès follow-up: field-level validation, Ort, optional labels, confirmation summary + account offer.

## Screenshots (Inès pass)

Geist + dirtywine grey (`hsl(223.81 0% 94%)`) + header. Fixtures mirror React UI.

| File | State | Width |
| --- | --- | --- |
| `form-guest-empty-{390,1440}.png` | Empty form | 390 / 1440 |
| `form-validation-errors-{390,1440}.png` | Per-field errors + summary | 390 / 1440 |
| `confirmation-account-offer-{390,1440}.png` | Confirmation + account offer | 390 / 1440 |

## Migrations (do not apply to production from this PR)

- `261_b2b_inquiries.sql` — base table
- `262_b2b_inquiries_guest_user.sql` — nullable `user_id`, claim token, owner SELECT RLS
- `263_b2b_inquiries_city.sql` — required `city` (Ort)
