# ISR public pages — design review

Screenshots for PR #115 (Unlock ISR for public pages) against the Vercel preview
after merging current `main`.

## Captures

| Surface | 390 | 1440 |
| --- | --- | --- |
| PACT home | `pact-home-390.png` | `pact-home-1440.png` |
| PACT PLP `/vin` | `pact-plp-390.png` | `pact-plp-1440.png` |
| PACT PDP | `pact-pdp-390.png` | `pact-pdp-1440.png` |
| PACT open cart | `pact-cart-390.png` | `pact-cart-1440.png` |
| Dirty Wine home | `dirtywine-home-390.png` | `dirtywine-home-1440.png` |
| Dirty Wine PLP | `dirtywine-plp-390.png` | `dirtywine-plp-1440.png` |
| Dirty Wine PDP | `dirtywine-pdp-390.png` | `dirtywine-pdp-1440.png` |
| Dirty Wine open cart | `dirtywine-cart-390.png` | `dirtywine-cart-1440.png` |

## How

```bash
PREVIEW_BASE=https://<preview>.vercel.app \
VERCEL_SHARE=<token> \
node scripts/isr-preview-verify-screenshots.mjs
```

- **PACT**: direct preview host (JWT from `_vercel_share`)
- **Dirty Wine**: local proxy `http://dirtywine.se:3099` → preview, so client host hydration brands Dirty Wine while HTML/API come from the shared ISR deployment

## Checks

See `verify-report.json` for automated assertions (branding, non-zero prices, cart API, open cart).
