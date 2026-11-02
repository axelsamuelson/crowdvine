# Dirtywine open sign-up — design review

Axel (2026-11-01): Dirty Wine login replaces invite-membership messaging with open sign-up (**Skapa konto**). Sign-up uses normal Supabase email confirmation (**Kolla din mejl**); after confirm, return to `next` (e.g. `/b2b/inquiry`). Guest inquiry (**Logga in** / **Fortsätt som ny kund**) stays available. pactwines.com invite/membership flow unchanged.

## Screenshots

Real local Next (`Host: dirtywine.se`), Geist, real Dirtywine header/logo. Next.js dev badge hidden.

| File | State | Width |
| --- | --- | --- |
| `login-skapa-konto-{390,1440}.png` | `/log-in` with new Skapa konto box | 390 / 1440 |
| `signup-form-{390,1440}.png` | `/signup` open sign-up form | 390 / 1440 |
| `signup-check-email-{390,1440}.png` | **Kolla din mejl** after submit | 390 / 1440 |
| `login-ny-kund-{390,1440}.png` | `/b2b/inquiry` Logga in / Fortsätt som ny kund | 390 / 1440 |

## Behaviour

- Login CTA → `/signup?next=…` (same slug/title as PACT).
- Open signup does **not** pre-confirm email; confirmation link returns to `next`.
- Guest path `/b2b/inquiry?guest=1` still works without an account.

## Migrations

None (uses existing `profiles.portal_access`).
