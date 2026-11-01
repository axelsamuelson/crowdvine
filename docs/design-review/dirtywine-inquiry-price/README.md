# Dirtywine B2B price: card = cart = inquiry = email

## Bug

Inquiry UI, confirmation, cart drawer, and submitted `unit_price_cents` used `priceExclVat(line.cost.totalAmount)` — **B2C retail incl. VAT ÷ 1.25** (~126 kr) instead of **`b2bPriceExclVat` (132 kr)** for Résiste 2025.

## Fix

- Inquiry + confirmation: `b2bPriceExclVat` × quantity
- Cart drawer (`cart-item.tsx` / `modal.tsx`): same in B2B mode only
- `POST /api/b2b/inquiry`: server recomputes `unit_price_cents` (client ignored)

## Artifacts (1× Résiste @ **132 kr**)

| File | Source |
| --- | --- |
| `card-390.png` / `card-1440.png` | Live `https://dirtywine.se/vin` (Host dirtywine.se) |
| `cart-390.png` / `cart-1440.png` | Fixture `cart-drawer-1bottle-132.html` (#138 header/logo/Geist/grey) |
| `inquiry-390.png` / `inquiry-1440.png` | Fixture `inquiry-1bottle-132.html` (post-#138 copy + thumbs) |

Capture: `node scripts/dirtywine-inquiry-price-screenshots.mjs`
