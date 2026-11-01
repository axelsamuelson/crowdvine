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
| `after-guider-vad-ar-naturvin-390.png` | 390 | H1 → Instrument Serif (root load) |
| `after-guider-vad-ar-naturvin-1440.png` | 1440 | Same |
