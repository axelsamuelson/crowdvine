# Geist-only typography (Instrument Serif removed)

Preview: `crowdvine-dr6v1ac6x-avesamuelson-7603s-projects.vercel.app`  
Share: append `?_vercel_share=AFWKs0qeI2vTREc0bVvnpiN4CGyS3uLn`

## Screenshots (390 + 1440)

| Page | Path | Files |
| --- | --- | --- |
| Home | `/` | `home-390.png`, `home-1440.png` |
| PLP | `/vin` | `plp-390.png`, `plp-1440.png` |
| PDP | `/produkt/l-2023` | `pdp-390.png`, `pdp-1440.png` |
| Guide Languedoc | `/guider/naturvin-languedoc` | `guide-languedoc-390.png`, `guide-languedoc-1440.png` |
| Guide pet-nat | `/guider/basta-pet-nat-systembolaget` | `guide-pet-nat-390.png`, `guide-pet-nat-1440.png` |
| Producers | `/producenter` | `producers-390.png`, `producers-1440.png` |
| Checkout | `/checkout` | `checkout-390.png`, `checkout-1440.png` |

## Font verification (guide pet-nat @ 1440)

- H1 computed `font-family`: `Geist, "Geist Fallback", ui-sans-serif, system-ui, sans-serif`
- Wine H3 computed `font-family`: same Geist stack; `font-weight: 500`; tracking ≈ `-0.02em`
- `document.fonts` families: Geist / Geist Fallback / Geist Mono only — **no Instrument Serif**
- `--font-instrument-serif`: empty
- Network: Geist woff2 only; **zero** Instrument Serif font requests

See `font-probes.json` and `rg-after.txt`.
