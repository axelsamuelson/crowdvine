# Remove Systembolaget price comparison — design review

Local screenshots of the only consumer: `WelcomeModal` step “Why PACT is Cheaper” (component `PriceComparisonVisual`). That modal is not mounted in the live app (onboarding redirects to `/onboarding` since the Opus port); harness was `/dev/price-comparison-preview` during capture only and is not in this PR.

## Usages removed

- `components/onboarding/price-comparison-visual.tsx` (deleted)
- `components/onboarding/welcome-modal.tsx` — import + step “Why PACT is Cheaper” / `TrendingDown` icon / step copy

No dedicated tests, i18n keys, or shared helpers existed for this visual.

## Screenshots

| File | Viewport | What |
| --- | --- | --- |
| `before-price-comparison-390.png` | 390 | Modal step with cost breakdown (PACT / Systembolaget / E-commerce) |
| `before-price-comparison-1440.png` | 1440 | Same |
| `after-welcome-390.png` | 390 | Surrounding step 1 after removal (5 dots; no empty gap) |
| `after-welcome-1440.png` | 1440 | Same |
| `after-how-it-works-390.png` | 390 | Former neighbor step now at index 1 |
| `after-how-it-works-1440.png` | 1440 | Same |
