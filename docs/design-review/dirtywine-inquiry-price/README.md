# Dirtywine B2B price: card = cart = inquiry = email

## Bug

Inquiry UI, confirmation summary, cart drawer, and submitted `unit_price_cents` used `priceExclVat(line.cost.totalAmount)` — i.e. **B2C retail incl. VAT ÷ 1.25**.

| | Per bottle |
| --- | ---: |
| Product card (`b2bPriceExclVat`) | **132 kr** |
| Bug (`157 / 1.25`) | ~126 kr |

Confirmed on production for **Résiste 2025**: card **132**; inquiry previously **754** for 6 (= ~126×6).

## Fix (this PR)

- Inquiry UI + confirmation: `b2bPriceExclVat` × quantity
- Cart drawer (`cart-item.tsx` / `modal.tsx`): same in B2B mode only
- `POST /api/b2b/inquiry`: **server recomputes** `unit_price_cents` (client amount ignored)
- Emails sum server `unitPriceCents × quantity`
- Keeps guest inquiry flow from #138

## Artifacts (1× Résiste @ **132 kr**)

| File | What |
| --- | --- |
| `card-390.png` / `card-1440.png` | Production listing: **132** exkl. moms |
| `cart-390.png` / `cart-1440.png` | Cart drawer: **132** for 1 flaska |
| `inquiry-390.png` / `inquiry-1440.png` | Inquiry summary: **132** for 1 flaska |
| `inquiry-before-1440.png` | Production bug: **754** for 6 (kept for contrast) |
