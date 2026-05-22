# Localization roadmap

## Implemented (foundation)

- **`ShoppingContext`** — resolves geo zone + `markets` + user `preferred_locale` + cookie (`pact_locale`).
- **API:** `GET /api/shopping-context`, `PATCH /api/user/preferred-locale`.
- **UI:** Header language switcher (en/sv) on pactwines; dirtywine stays English-only.
- **Messages:** `messages/en.json`, `messages/sv.json` (header + checkout payment copy).
- **Stripe:** PaymentIntent currency from context; Elements locale from user language.
- **Migration 154:** `profiles.preferred_locale`.

## Remaining for 100%

### Commerce (currency + pricing)

- [x] Display FX: SEK amounts converted via `/api/exchange-rates` for non-SEK `currencyCode`.
- [x] `CartService` + `products-data` emit display `currencyCode` from shopping context.
- [x] Stripe PaymentIntent amount scaled to display currency; `useFormatPrice()` / `useDisplayMoney()` for key UI.
- [x] Checkout totals + shipping use display currency (SEK shipping converted); PDP price breakdown + reservations.
- [ ] Server-side cart/checkout validation still anchored in SEK (`cart_total_sek`) — document for ops.
- [ ] Dedicated list prices per market in DB (optional; today conversion is display-layer only).

### Language (i18n)

- [x] Message catalogs: shop, cart, product, wine zone settings, checkout (see `messages/en.json`, `messages/sv.json`).
- [x] `useTranslations()` hook (alias of shopping context `t()`).
- [ ] PDP body copy, filters, emails, admin UI.
- [ ] Optional: `next-intl` with route segments.
- [ ] `site_content` keys per locale (`site_title_sv`).
- [ ] Retire legacy `getCheckoutBrowseOnlyUnsupportedCountryMessage` in `lib/countries.ts` when unused.

### Market + shipping

- [ ] Catalog/PDP gates via `ResolvedMarket` (not only legacy `getCountryMarketMode`).
- [ ] Translated shipping / zone copy tied to `geo_zones` + logistics zones.
- [ ] US USD phase: update `markets` seed + Stripe when product is ready.

### B2B (dirtywine)

- [ ] Decide if dirtywine gets separate catalog or stays EN-only with SEK/EUR B2B pricing.

## Ops

Run migration: `pnpm migrate` (or your usual path for `migrations/154_profiles_preferred_locale.sql`).
