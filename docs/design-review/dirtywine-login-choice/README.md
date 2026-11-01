# Dirtywine login-choice inquiry step — design review

Axel (2026-11-01): logged-out cart CTA → intermediate step with equal choices **Logga in** / **Fortsätt som ny kund**; logged-in users skip to the prefilled form; server falls back to profile for empty fields.

## Screenshots

Geist + dirtywine grey (`hsl(223.81 0% 94%)`) + real Dirtywine header logo (same as #138).

| File | State | Width |
| --- | --- | --- |
| `login-choice-{390,1440}.png` | Intermediate Logga in / Fortsätt som ny kund | 390 / 1440 |
| `form-guest-empty-{390,1440}.png` | Guest form after «Fortsätt som ny kund» | 390 / 1440 |
| `form-logged-in-prefilled-{390,1440}.png` | Logged-in form with profile prefill | 390 / 1440 |

## Behaviour

- Cart inquiry CTA still goes to `/b2b/inquiry`.
- Logged-out without `?guest=1` → choice step.
- «Logga in» → `/log-in?next=/b2b/inquiry` (returns to form after auth).
- «Fortsätt som ny kund» → `/b2b/inquiry?guest=1` (guest form from #138).
- Logged-in → form immediately with prefill; only missing account fields required (client + server).

## Migrations

None (uses existing profile / invoice_recipients + #138 inquiry schema through `263`).
