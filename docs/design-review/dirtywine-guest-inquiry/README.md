# Dirtywine guest B2B inquiry — design review

Axel (2026-11-01): guests may submit `/b2b/inquiry` without membership; optional account after submit to save the inquiry. **dirtywine.se only** (inquiry mode flag).

## Screenshots

| File | State | Width |
| --- | --- | --- |
| `form-guest-empty-390.png` / `form-guest-empty-1440.png` | Logged out, empty form | 390 / 1440 |
| `form-validation-errors-390.png` / `form-validation-errors-1440.png` | Swedish validation error | 390 / 1440 |
| `confirmation-account-offer-390.png` / `confirmation-account-offer-1440.png` | Confirmation + optional account | 390 / 1440 |
| `form-logged-in-prefilled-390.png` / `form-logged-in-prefilled-1440.png` | Logged in, fields prefilled | 390 / 1440 |

HTML fixtures in this folder mirror the React UI for review; production path is `app/b2b/inquiry`.

## Migration

`migrations/262_b2b_inquiries_guest_user.sql` — nullable `user_id`, claim token hash/expiry, owner SELECT RLS. **Do not apply to production from this PR alone.**
