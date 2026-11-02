# Instrument Serif root load — design review

`--font-instrument-serif` was only set in a few route layouts (`/i/*`, `/p/*`, …). Tailwind `font-serif` resolves to that variable sitewide, so routes such as `/guider/*` fell back when the variable was missing.

## Fix

Load `Instrument_Serif` in `app/layout.tsx` next to Geist and apply `.variable` on `<body>`. Redundant loads removed from `app/i/[code]/layout.tsx` and `app/p/[code]/layout.tsx` (safe: variable inherits from root).

## Screenshots

Page: `/guider/vad-ar-naturvin` (Swedish). H1 styled with `font-family: var(--font-instrument-serif, Times, "Times New Roman", serif)` for the review so the missing vs loaded variable is visible (guide H1 markup was unchanged).

| File | Viewport | What |
| --- | --- | --- |
| `before-guider-vad-ar-naturvin-390.png` | 390 | H1 → Times (var undefined on production) |
| `before-guider-vad-ar-naturvin-1440.png` | 1440 | Same |
| `after-guider-vad-ar-naturvin-390.png` | 390 | H1 → Instrument Serif (root load, local) |
| `after-guider-vad-ar-naturvin-1440.png` | 1440 | Same |

## Font verification (`/guider/vad-ar-naturvin`)

Same H1 injection as the screenshots. After = local with this PR; before = production.

### Computed `font-family`

| Viewport | State | H1 | Body text (`h1 + p`) |
| --- | --- | --- | --- |
| 390 | before (prod) | `Times, "Times New Roman", serif` | `Geist, "Geist Fallback", sans-serif` |
| 1440 | before (prod) | `Times, "Times New Roman", serif` | `Geist, "Geist Fallback", sans-serif` |
| 390 | after (local) | `"Instrument Serif", "Instrument Serif Fallback"` | `Geist, "Geist Fallback", sans-serif` |
| 1440 | after (local) | `"Instrument Serif", "Instrument Serif Fallback"` | `Geist, "Geist Fallback", sans-serif` |

### `document.fonts.check` + Network woff2 (after, both viewports)

- `document.fonts.check('400 48px "Instrument Serif"')` → **true**
- `document.fonts.check('400 16px Geist')` → **true**
- Network (HTTP 200), mapped via `@font-face`:
  - Instrument Serif: `e41d5df559864f9e-s.p.380d09ea.woff2` (normal), `7ebf22b5a21034f8-s.p.d8bad3ab.woff2` (italic)
  - Geist: `caa3a2e1cccd8315-s.p.3b6cae6d.woff2` (+ `/__nextjs_font/geist-latin.woff2`)

Before (prod): `--font-instrument-serif` empty; no Instrument Serif woff2 in the Network log; only Geist / Geist Mono woff2 (200).
