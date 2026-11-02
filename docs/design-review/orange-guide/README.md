# Orange guide — Swedish editorial rewrite

`/guider/basta-orange-naturviner-systembolaget` after replacing the live ranked
list with the SEO draft (H1 **Bra orange vin på Systembolaget**, Axel Samuelson
byline, FAQ, no prices/images/shop CTA).

## Screenshots

Captured from the Vercel preview for PR branch `cursor/orange-guide-sv-6a01`
(commit matching the preview deploy).

| Viewport | File |
| --- | --- |
| 390 | `orange-guide-390.png` |
| 1440 | `orange-guide-1440.png` |

## Capture

```bash
ORANGE_GUIDE_URL='https://<preview>/guider/basta-orange-naturviner-systembolaget?_vercel_share=…' \
  node scripts/orange-guide-screenshots.mjs
```
