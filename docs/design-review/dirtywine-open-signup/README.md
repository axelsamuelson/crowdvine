# Dirtywine open sign-up — design review

Axel (2026-11-01): Dirty Wine login replaces invite-membership messaging with open sign-up (**Skapa konto**). Direct account creation on dirtywine.se (no invite / no approval); return to `next` (e.g. `/b2b/inquiry`) with form prefill. Guest inquiry (**Logga in** / **Fortsätt som ny kund**) unchanged. pactwines.com invite/membership flow unchanged.

## Screenshots

Geist + dirtywine grey (`hsl(223.81 0% 94%)`) + real Dirtywine header logo.

| File | State | Width |
| --- | --- | --- |
| `signup-form-{390,1440}.png` | Open sign-up form (`/signup`) | 390 / 1440 |
| `login-ny-kund-{390,1440}.png` | Inquiry choice: Logga in / Fortsätt som ny kund | 390 / 1440 |
| `plp-{390,1440}.png` | Assortment PLP (`/vin`) | 390 / 1440 |
| `pdp-{390,1440}.png` | Product PDP | 390 / 1440 |

## Behaviour

- Login on dirtywine.se shows **Skapa konto** CTA → `/signup?next=…` (same slug as PACT).
- Sign-up creates a business-portal account immediately; redirects to `next` (e.g. inquiry with prefill).
- Guest path `/b2b/inquiry?guest=1` still works without an account.

## Migrations

None (uses existing `profiles.portal_access`).
