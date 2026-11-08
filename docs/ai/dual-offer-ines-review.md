# Dual-offer checkout — Inès design/flow review

**Frozen head:** see PR #206 tip after this increment.  
**Flags:** `CHECKOUT_DUAL_OFFER_COMPARE` default OFF; `DIRECT_BOX_CHECKOUT_ENABLED` remains OFF.  
**Production:** surface + API denied when `NODE_ENV=production` and `VERCEL_ENV≠preview`.

## What this is

Preview/test dual-offer **quote review** in checkout components (not a live Stripe/order path).

- Shared pallet: lower sample bottle + freight, longer wait, no immediate debit (copy).
- Direct: higher sample bottle + freight (synthetic uplift), shorter delivery (proposed).
- Sample prices / undecided contract / undecided methods — **not** live business promises.
- Selecting an offer ≠ payment consent. Accept quote = review acceptance only.
- Migration **279 unapplied** → live payment/order fail-closed (`offer_snapshot_persistence_unavailable` / synthetic gates). Quote hash alone is **not** authorization.

## Runnable preview (no env/deployment config changes required to *read* this doc)

### A) Local synthetic review (no Stripe/DB)

```bash
# temporary for local process only — do not commit
export CHECKOUT_DUAL_OFFER_COMPARE=true
pnpm dev
# open http://localhost:3000/dev/dual-offer-compare
# SV/EN toggle on page; Geist via font-sans
```

If flag is unset → `404` / `notFound`.

### B) Test checkout mount (server payload)

With the same flag in a **preview or local** process, open `/checkout` after a quoteable destination + pallet. Panel fetches `POST /api/checkout/offer-quotes` with `allow_synthetic_direct: true`. Final Pay/Reserve for dual path stays blocked.

Normal checkout with flag **OFF** is unchanged (shared-pallet only).

### C) Vercel preview

If the branch auto-deploys a preview, set `CHECKOUT_DUAL_OFFER_COMPARE=true` **only** on that Preview environment in the Vercel dashboard (human action — agents must not change env). Then:

- `/dev/dual-offer-compare`
- `/checkout` (dual panel when destination+pallet known)

Do **not** promote or retarget production.

## Review checklist for Inès

- [ ] Mobile ~375/390 and desktop ~1440, SV and EN
- [ ] Bottle, wines subtotal, freight, VAT/fees note, total equally prominent
- [ ] Delivery timing + debit timing shown together
- [ ] Switch discloses bottle + total change; no silent switch
- [ ] Accept quote ≠ Pay; final CTA blocked with explicit reason
- [ ] Synthetic badge conspicuous; sample-price disclaimer visible
- [ ] Geist (`font-sans`) on review surface

## Difference: mocked preview vs actual test checkout

| | `/dev/dual-offer-compare` | `/checkout` (flag ON, preview/local) |
|---|---|---|
| Payload | In-process synthetic fixture | `POST /api/checkout/offer-quotes` (cart/pallet) |
| Auth | None | Session required for API |
| Payment | Impossible (blocked UI) | Shared-pallet Stripe path unchanged; dual final blocked |
| Snapshot persist | N/A (279 unapplied) | Fail-closed boundary |

## CRO note

Camille owns CRO. This increment does not invent a new funnel step analytics contract; dual panel is gated preview UI only.
