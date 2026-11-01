# Dirty Wine — cart shipping line copy

On `dirtywine.se` (B2B / restaurant mode), the cart drawer shipping line reads
**Frakt – ingår i priset (leverans i Stockholm ingår)** instead of
**Frakt – Beräknas i kassan**. `pactwines.com` keeps the checkout-calculated copy.

Inquiry page has no separate shipping line (unchanged).

## Screenshots

| Surface | 390 | 1440 |
| --- | --- | --- |
| Cart drawer (open, ≥1 bottle) | `cart-drawer-390.png` | `cart-drawer-1440.png` |

Captured against local Next with `Host: dirtywine.se` (Geist + real Dirtywine header).

## Capture

```bash
# /etc/hosts: 127.0.0.1 dirtywine.se
NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE=inquiry DIRTYWINE_CHECKOUT_MODE=inquiry pnpm dev
node scripts/dirtywine-shipping-line-screenshots.mjs
```
