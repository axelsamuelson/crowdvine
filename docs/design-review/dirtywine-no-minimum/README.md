# Dirtywine — no restaurant minimum

Screenshots for removing the 6-bottle / pack minimum on dirtywine.se (restaurants can order qty ≥ 1). PACT unchanged.

## Screenshots

| Surface | 390 | 1440 |
| --- | --- | --- |
| Product cards (assortment) | `product-card-390.png` | `product-card-1440.png` |
| Inquiry form (cart with 1–2 bottles + login gate) | `inquiry-form-390.png` | `inquiry-form-1440.png` |

Captured against local Next with `Host: dirtywine.se` and `NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE=inquiry`. Product cards show no «Minst 6 flaskor» line. Inquiry shows **1 flaska** / **2 flaskor** line quantities with no pack/minimum messaging.

## Capture

```bash
# /etc/hosts: 127.0.0.1 dirtywine.se
NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE=inquiry DIRTYWINE_CHECKOUT_MODE=inquiry pnpm dev
node scripts/dirtywine-no-minimum-screenshots.mjs
```
