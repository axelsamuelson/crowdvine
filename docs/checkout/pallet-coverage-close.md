# Shared-pallet coverage close (Axel 2026-11-11)

Coverage-based lock rule (Ingrid CFO formula) + sold-out-at-lock choice (00:30 / 00:41).

**Status:** Implemented behind flags (default OFF). Migration **`285_pallet_coverage_close.sql`** is file-only — do **not** apply from an agent.

**Gates**

| Env | Default | Purpose |
| --- | --- | --- |
| `PALLET_COVERAGE_CLOSE_ENABLED` | OFF | Cron + one-open assignment + new pallet defaults |
| `PALLET_COVERAGE_CLOSE_SEND_EMAIL` | OFF | Heads-up + sold-out choice emails (like `RESERVATION_EXPIRY_SEND_EMAIL`) |

`DIRECT_BOX_CHECKOUT_ENABLED` stays OFF. Do not edit `content/legal/*`. Customer copy is `TODO(Juliette/Margaux)` until Axel approves word for word.

**Coverage**

```
contribution_before_pallet = wine_margin − EPR + shipping_ex_VAT − Stripe
coverage = sum(contribution) / (fixed_pallet_cost + sum(Instabee))
```

Instabee is denominator-only. Cap 600 bottles → lock immediately. Time thresholds from first order (day 7 → **125%**, day 14 → 100%, day 21 → floor 70%); schedule next Monday (configurable) when threshold met; re-check at lock.

Env knobs: `PALLET_COVERAGE_DAY_7` / `PALLET_COVERAGE_RATIO_DAY7` (default 1.25), plus `_DAY_100` / `_RATIO_100`, `_DAY_FLOOR` / `_RATIO_FLOOR`.

**Sold-out at lock** (Axel 01:00 packing rule)

Each producer/wholesaler packs boxes of **6** (`wines.source_type` + `producer_id` / `source_name`). Mix within a source is OK.

Admin marks wine unavailable → lines `pending_choice` → email + `/pallet-lock-choice`.

- If removing the wine still leaves every source at a multiple of 6 → **replace** (same source) or **remove**.
- If removal would break packing → **replace** (same source) or **cancel the whole order** (nothing charged; bottles leave the pallet).
- No answer: remove when packing stays valid; otherwise cancel the whole order without charge.
- Coverage is recomputed after removal/cancellation (cron loads only active reservations / non-removed lines).

Charge when not cancelled = original − removed + pricier replacement delta only.

Code: `lib/pallet-coverage-close/` + `lib/cart/packing-source.ts`. Cron: `/api/cron/pallet-coverage-close`.
