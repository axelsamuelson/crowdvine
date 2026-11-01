# Dirty Wine — cart shipping line copy

On `dirtywine.se` (B2B / restaurant mode), the cart drawer shipping line reads
**Frakt – ingår i priset (leverans i Stockholm ingår)** instead of
**Frakt – Beräknas i kassan**. `pactwines.com` keeps the checkout-calculated copy.

Inquiry page has no separate shipping line (unchanged).

## Screenshots

Retaken after merging `main` (includes #142 cart B2B price fix + #144 `lib/pricing`).
Same commit as the Vercel preview (`d3402f68`). Dirty Wine host routing requires
`Host: dirtywine.se` (preview `*.vercel.app` serves PACT), so captures use local
Next of that commit with Host override — same approach as #142 design-review.

| Surface | 390 | 1440 |
| --- | --- | --- |
| Cart closed (badge / Varukorg (1)) | `cart-closed-390.png` | `cart-closed-1440.png` |
| Cart drawer open (≥1 bottle) | `cart-drawer-390.png` | `cart-drawer-1440.png` |

Verified: line price / total **132 kr** (not 0 kr); shipping copy **ingår i priset (leverans i Stockholm ingår)**.

## Capture

```bash
# /etc/hosts: 127.0.0.1 dirtywine.se
NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE=inquiry DIRTYWINE_CHECKOUT_MODE=inquiry pnpm dev
node scripts/dirtywine-shipping-line-screenshots.mjs
```
