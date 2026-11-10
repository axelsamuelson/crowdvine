# Shared-pallet coverage close (Axel 2026-11-11)

Coverage-based lock rule (Ingrid CFO formula) + sold-out-at-lock choice (00:30).

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

Instabee is denominator-only. Cap 600 bottles → lock immediately. Time thresholds from first order; schedule next Monday (configurable) when threshold met; re-check at lock.

**Sold-out at lock**

Admin marks wine unavailable → lines `pending_choice` → email + `/pallet-lock-choice`. Charge = original − removed + pricier replacement delta only. No answer → remove (TODO(Axel) confirm).

Code: `lib/pallet-coverage-close/`. Cron: `/api/cron/pallet-coverage-close`.
