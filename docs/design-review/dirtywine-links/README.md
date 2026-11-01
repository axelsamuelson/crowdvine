# Dirty Wine — remove PACT-only nav links (CORS)

On `dirtywine.se`, Next.js prefetch of `/guider*`, `/vin/naturvin-lada`, and
`/guider/hemleverans-av-naturvin` followed middleware 301s to `pactwines.com`,
which logged CORS errors on every page. Profil / Om oss are PACT-only chrome
and are removed from Dirty Wine header/footer/menu (no redirect rule changes).

## Screenshots

Host: `dirtywine.se` (production for before; local `Host: dirtywine.se` for after).

| Surface | 390 | 1440 |
| --- | --- | --- |
| Home header before | `before-home-header-390.png` | `before-home-header-1440.png` |
| Home header after | `after-home-header-390.png` | `after-home-header-1440.png` |
| Home footer before | `before-home-footer-390.png` | `before-home-footer-1440.png` |
| Home footer after | `after-home-footer-390.png` | `after-home-footer-1440.png` |
| Mobile menu before | `before-home-menu-390.png` | — |
| Mobile menu after | `after-home-menu-390.png` | — |
| PLP header before | `before-plp-header-390.png` | `before-plp-header-1440.png` |
| PLP header after | `after-plp-header-390.png` | `after-plp-header-1440.png` |
| PDP before | `before-pdp-390.png` / `before-pdp-delivery-390.png` | `before-pdp-1440.png` / `before-pdp-delivery-1440.png` |
| PDP after | `after-pdp-390.png` / `after-pdp-delivery-390.png` | `after-pdp-1440.png` / `after-pdp-delivery-1440.png` |
| Open cart before | `before-cart-390.png` | `before-cart-1440.png` |
| Open cart after | `after-cart-390.png` | `after-cart-1440.png` |

CORS console capture: `before-cors-report.json` (redirects to pactwines.com) vs
`after-cors-report.json` (empty).

## What changed (Dirty Wine only)

Removed from chrome when `isDirtywineSite` / `useB2BModeServerHint()`:

- Header: Guider, Profil
- Mobile menu: Guider, Profil, Om oss
- Footer: Om oss, Profil (guides were already gated)
- Home hero: Se vinlådor → `/vin/naturvin-lada`
- Cart + PDP: “Så fungerar hemleverans”
- PLP below-fold: guide / hemleverans explore links

No middleware / redirect / route URL changes. pactwines.com unchanged.

Capture helper: `scripts/dirtywine-links-screenshots.mjs`.
