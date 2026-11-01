# Dirtywine cart/inquiry showing 0 kr (cart-service b2bPriceExclVat)

## Bug

After PR #140, B2B cart drawer and `/b2b/inquiry` read `product.b2bPriceExclVat`, but `CartService.getCart` never set it → **0 kr exkl. moms**.

## Fix

`src/lib/cart-service.ts` selects wine cost/margin columns and sets `merchandise.product.b2bPriceExclVat` via `computeInquiryB2bUnitPriceExclVatSek` (same as inquiry server pricing), including pallet shipping per bottle (admin client, matching products-data).

## Artifacts (1× Résiste @ **132 kr**)

Captured against this PR’s code with Next on `:3000` and `Host: dirtywine.se` (real Dirtywine header + Geist). Vercel preview of the same commit is green; Dirty Wine host routing requires `dirtywine.se`, so screenshots use local Host override of the PR build.

| File | View |
| --- | --- |
| `cart-390.png` / `cart-1440.png` | Cart drawer |
| `inquiry-390.png` / `inquiry-1440.png` | `/b2b/inquiry` |

Capture: `node scripts/dirtywine-cart-price-zero-screenshots.mjs`
