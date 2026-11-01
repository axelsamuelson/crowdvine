# Dirty Wine — footer contact + drop «Kom igång»

On `dirtywine.se` only: remove PACT’s consumer onboarding CTA («Kom igång» /
«Hjälp») from the footer, and replace `customer@pactwines.com` in footer +
mobile menu with `DIRTYWINE_CONTACT_EMAIL` / `NEXT_PUBLIC_DIRTYWINE_CONTACT_EMAIL`
(fallback `axel@dirtywine.se` while Axel decides). `pactwines.com` unchanged.

Depends on [#137](https://github.com/axelsamuelson/crowdvine/pull/137) (PACT-only
nav link removals in the same footer/menu).

## Screenshots

| Surface | 390 | 1440 |
| --- | --- | --- |
| Footer before | `before-footer-390.png` | `before-footer-1440.png` |
| Footer after | `after-footer-390.png` | `after-footer-1440.png` |
| Menu before | `before-menu-390.png` | — (Meny is `md:hidden`; desktop contact is footer-1440) |
| Menu after | `after-menu-390.png` | — |

Before: production `dirtywine.se`. After: local `Host: dirtywine.se` on this branch
(includes #137 chrome).

## Env

```bash
# Prefer NEXT_PUBLIC_ so client chrome can read it
NEXT_PUBLIC_DIRTYWINE_CONTACT_EMAIL=axel@dirtywine.se
# DIRTYWINE_CONTACT_EMAIL=axel@dirtywine.se
```
