# Exit-discount cart block design review

Real rendered screenshots of the inline cart offer (not a modal), with
`NEXT_PUBLIC_EXIT_DISCOUNT_ENABLED=true` / `EXIT_DISCOUNT_ENABLED=true` forced
**locally only**. Code default and production remain OFF.

Surface: `/dev/exit-discount-cart` (404 when flag off).

## Files

| File | State |
| --- | --- |
| `mobile-375-cart-offer.png` | Offer block in cart @ 375 |
| `desktop-1440-cart-offer.png` | Offer block in cart @ 1440 |
| `mobile-375-cart-filled.png` | Filled form, newsletter unchecked @ 375 |
| `desktop-1440-cart-filled.png` | Filled form @ 1440 |
| `mobile-375-cart-account-step.png` | Skippable account step @ 375 |
| `desktop-1440-cart-account-step.png` | Skippable account step @ 1440 |

## Analytics

- `exit_discount_shown` — once per analytics session when the block mounts
- `exit_discount_submitted` — on successful form submit
