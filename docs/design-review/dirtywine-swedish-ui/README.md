# Dirtywine Swedish UI — design review

Local screenshots against `Host: dirtywine.se` on a real Next.js dev server (no HTML mocks). Theme left light; pactwines.com CRO untouched.

## Screenshots

| Page | 390 | 1440 |
| --- | --- | --- |
| Home before | `before-home-390.png` | `before-home-1440.png` |
| Home after | `after-home-390.png` | `after-home-1440.png` |
| Assortment before | `before-assortment-390.png` | `before-assortment-1440.png` |
| Assortment after | `after-assortment-390.png` | `after-assortment-1440.png` |
| Product before | `before-product-390.png` | `before-product-1440.png` |
| Product after | `after-product-390.png` | `after-product-1440.png` |

Product handle used: `/produkt/vermentino-2022`.

## What changed (strings)

### Forced Dirtywine locale → Swedish

Dirtywine had `uiLocalizationEnabled=false`, which previously pinned `DEFAULT_APP_LOCALE` (`en`). Fixed locale is now **`sv`** (`FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED`) so message catalogs resolve Swedish without enabling the language switcher.

### Header / cart (desktop)

| Before | After |
| --- | --- |
| HOME | Hem |
| ALL WINES | Alla viner |
| GUIDES | Guider |
| Profile | Profil |
| CART (0) | Varukorg (0) |

Desktop Dirtywine nav/cart use sentence case (no CSS `uppercase`). Logo desktop max height **28px** (`md:h-7`).

### Homepage CTAs

| Before | After |
| --- | --- |
| All wines | Alla viner |
| See wine boxes | Se vinlådor |

### Mobile menu

| Before | After |
| --- | --- |
| Menu / MENU | Meny |
| Close | Stäng |
| Producer / Admin (hardcoded EN) | Producent / Admin via `nav.*` |

### Login (`/log-in`)

Hardcoded English → `auth.*` keys (SV on Dirtywine): Välkommen tillbaka, E-postadress, Lösenord, Logga in, Glömt lösenord?, Tillbaka till startsidan, etc.

### Catalog chrome

- Product card color swatch labels via `formatWineColorDisplay` (Red→Rött, White→Vitt, …).
- Carousel sr-only: Föregående bild / Nästa bild.
- Unsupported-country browse message on Dirtywine: Swedish-only.

### Message catalog tweaks (SV)

- `nav.home`: hem → Hem
- `nav.producer` / `nav.admin`: capitalized
- `cart.cartLabel`: varukorg → Varukorg
- New: `common.menu`, `common.close`, `common.openMenu`, `common.closeMenu`, `common.previousSlide`, `common.nextSlide`, full `auth.*` block

## Left unchanged (and why)

| Item | Why |
| --- | --- |
| Light theme / colors | Explicitly out of scope |
| pactwines.com CRO / exit feedback | Explicitly out of scope; Dirtywine-gated only |
| Language switcher on Dirtywine | Still off — Swedish-only fixed locale |
| Guider nav item | Requested in desktop header; production still 301s guides to PACT |
| Se vinlådor CTA | Requested; producer-box landings still redirect Dirtywine → PACT |
| Wine/product names, grape names, producer names | Catalog data, not UI chrome |
| Instagram / mailto contact labels | Brand handles / addresses |
| Admin / producer portals | Not Dirtywine customer UI |
| Inquiry SV copy in `lib/b2b/inquiry-copy.ts` | Already Swedish |
