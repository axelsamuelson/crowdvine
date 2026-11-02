# Pet-nat guide — Swedish editorial rewrite

`/guider/basta-pet-nat-systembolaget` after replacing the live ranked
list with the SEO draft (H1 **Bästa pet nat på Systembolaget**, Axel Samuelson
byline, FAQ, no prices/images/shop CTA).

## Screenshots

Captured from the Vercel preview for PR branch `cursor/pet-nat-guide-sv-a548`
(commit matching the preview deploy).

| Viewport | File |
| --- | --- |
| 390 | `pet-nat-guide-390.png` |
| 1440 | `pet-nat-guide-1440.png` |

## Font check

H1 computed `font-family`: `"Instrument Serif", "Instrument Serif Fallback", serif`.
Instrument Serif (weight 400, normal) reports `status: loaded` on both viewports
(`font-probe-390.json`, `font-probe-1440.json`).

## Capture

```bash
PET_NAT_GUIDE_URL='https://<preview>/guider/basta-pet-nat-systembolaget?_vercel_share=…' \
  node scripts/pet-nat-guide-screenshots.mjs
```
