# Shared-pallet close flow (follow-up)

Owner decisions (Axel) for what happens when a shared pallet reaches its
last date without filling, plus related charge / cancel / email behaviour.

**Status:** Implemented behind flags in the dual-offer PR (default OFF).
Customer-facing `senast {datum}` is shown in dual-offer checkout and on
order confirmation. Close-time automation lives under
`lib/checkout/pallet-close/` + cron `/api/cron/pallet-close`.

**Gate (defense in depth):** both `PALLET_CLOSE_FLOW_ENABLED=true` **and**
`CHECKOUT_DUAL_OFFER_COMPARE=true`. Cron no-ops otherwise.

**Do not** apply migration `281` (or 279/280) to prod from an agent — TEST
Supabase first, prod only after owner yes. Cron is inert while the gate is off.

**Lifecycle ownership:** when the gate is on (or a row already has
`pallet_close_state`), reservation-expiry cron skips that row
(`pallet_close_flow_owns`) so there is no double-handling.

---

## Product rules

### Open window / last date

- Shared pallet may stay open **at most 4 weeks** from open/creation.
- **Deadline source (today):** `pallets.created_at + 28 days`
  (`lib/checkout/shared-pallet-deadline.ts` → `charge_deadline_at` on the
  offer quote). There is **no** stored `closes_at` column yet.
- Pallet closes (and the saved card is charged) when **full** **or** the
  last date is reached — whichever first.
- The last date is shown as **`senast {datum}`** in:
  - Checkout (dual-offer legal line + pre-CTA summary)
  - Order confirmation page (`/checkout/success`)
  - Order confirmation email

### At last date, pallet not full — customer choice

Customer receives a **choice email** with:

| Option | Behaviour |
| --- | --- |
| **Wait longer** | One extension of **at most 4 more weeks**. Customer must **actively choose** it. Price unchanged. Free cancellation continues until the new deadline. |
| **Cancel** | No charge. Saved card / payment method is **detached**. |
| **Switch to direct** | Only when `DIRECT_BOX_CHECKOUT_ENABLED` is on. Requires a **new quote** and **new explicit acceptance**. Never auto-switch. |

### No answer

- If the customer does **not** answer within **7 days** of the choice email:
  purchase is **cancelled at no cost** and the card is **detached**.

### Off-session charge failure at close

- If the off-session charge at close fails: customer has **3 days** to pay
  via a **payment link**.
- After 3 days without payment: reservation is **cancelled**.

### Emails required (new / updated)

1. **Pallet closed / charged** — successful close charge (or filled-pallet charge).
2. **Choice email** — last date reached, not full: wait / cancel [/ direct if flag on].
3. **Cancellation** — customer cancel, 7-day no-answer, or failed-pay window expired.
4. **Pallen har skickats** — admin marks shipped + estimated delivery window (`lib/checkout/pallet-delivery-notify/`).
5. **Leveransdag** — admin marks arrived in Sweden + delivery day.
6. **Delay notice** — admin sets a new expected date; if &gt;30 days after close without delivery, include cancel-for-full-refund (refund within 14 days).

Post-close delivery emails: migration **`282_pallet_delivery_notify.sql` (file only — not applied)**. Same gate. Idempotent via `email_sends` (shipped / day once per reservation; delay once per expected date). No emails are sent while flags/Resend are off.

---

## Data model (proposed — not applied)

Additive columns / tables for a future migration (next free prefix after
current numbered migrations). Prefer nullable columns on existing rows
over inventing a second reservation tree.

### `pallets` (or reservation-level if multi-deadline needed)

| Column | Purpose |
| --- | --- |
| `charge_deadline_at timestamptz` | Authoritative close/charge deadline (seed from `created_at + 28d`; updated on accepted extension). |
| `close_state text` | e.g. `open` \| `choice_pending` \| `extended` \| `charging` \| `closed_charged` \| `closed_cancelled`. |

Until this column exists, runtime continues to **compute**
`created_at + 28d`.

### `order_reservations` (shared-pallet rows)

| Column | Purpose |
| --- | --- |
| `charge_deadline_at timestamptz` | Snapshot of deadline shown at confirm (immutable for audit; extensions write a new value + history). |
| `pallet_close_choice text null` | `wait` \| `cancel` \| `switch_direct` once answered. |
| `pallet_close_choice_at timestamptz` | When the customer answered. |
| `pallet_close_choice_sent_at timestamptz` | When choice email was sent. |
| `pallet_close_choice_reply_by timestamptz` | `sent_at + 7 days`. |
| `pallet_close_extension_count int` | Max **1** under current product rule. |
| `offsession_charge_failed_at timestamptz` | Start of 3-day pay window. |
| `offsession_pay_by timestamptz` | `failed_at + 3 days`. |
| `offsession_payment_link_url text` | Stripe payment link (or Checkout Session URL). |
| `payment_method_detached_at timestamptz` | Audit when PM detached on cancel. |

Optional history table `pallet_close_events (reservation_id, event, at, meta jsonb)` for audit without PII in `user_events`.

### Explicit non-goals for v1 schema

- Do **not** reuse `payment_deadline` from the legacy post-fill payment-link
  flow without renaming — that column means “pay after pallet complete”,
  not the 4-week open-window deadline.
- Do **not** conflate with the **90-day reservation expiry / extension**
  cron (`/api/cron/reservation-expiry`). That path is about long-lived
  unfilled reservations; this close flow is about the **4-week open
  window** and charge-at-close.

---

## Jobs / crons (proposed)

All schedules UTC (see `vercel.json`). Suggested new cron paths (names
illustrative):

| Job | Cadence (proposal) | Responsibility |
| --- | --- | --- |
| `pallet-close-deadline` | hourly | Find open shared-pallet reservations whose `charge_deadline_at` (or computed) ≤ now and pallet not full → enter `choice_pending`, send **choice email**, set `reply_by = now+7d`. If pallet **is** full → run charge path (existing auto-charge) + **closed/charged** email. |
| `pallet-close-choice-timeout` | hourly | `choice_pending` and `now > reply_by` with no answer → cancel, detach PM, **cancellation** email. |
| `pallet-offsession-retry` / extend existing `retry-failed-payments` | hourly | On off-session failure: set `pay_by = now+3d`, send payment link; on success → charged email; on timeout → cancel + detach + cancellation email. |

Tokenised customer actions (signed links, short TTL):

- `GET/POST /api/pallet-close/wait` — accept one extension (≤ +28d), bump deadline, clear choice_pending.
- `GET/POST /api/pallet-close/cancel` — cancel + detach.
- `GET/POST /api/pallet-close/switch-direct` — only if direct flag on; create new direct quote session requiring explicit acceptance (reuse dual-offer accept gate).

---

## Email triggers (spec)

| Email | Trigger | Notes |
| --- | --- | --- |
| Order confirmation (existing) | Checkout confirm | Already includes `senast {datum}` when pallet-based. |
| Choice | Deadline reached, not full | Wait / cancel [/ direct]. Idempotent via `email_sends`. |
| Closed / charged | Successful off-session (or pay-link) charge | Distinct from confirmation. |
| Cancellation | Customer cancel, 7d silence, or 3d pay-link expiry | Confirm PM detached. |

Templates: follow existing string builders in `lib/sendgrid-service.ts` /
`lib/email/*` + `email_sends` claims. Swedish-first customer copy;
English via i18n or locale on profile.

---

## Checkout / confirmation (this PR)

In scope for the dual-offer PR (implemented without applying migrations):

- Compute deadline from `pallets.created_at + 28d`.
- Surface `senast {datum}` in dual-offer checkout copy.
- Surface the same deadline on `/checkout/success` and in the order
  confirmation email payload when the reservation is pallet-based.

Out of scope here: choice email, extension API, detach, switch-to-direct
at close, new crons, new migrations applied to prod.

---

## Owner decisions (locked)

1. Migrations 279/280/281 → isolated TEST Supabase first; prod only after
   owner yes. Agents never apply.
2. `PALLET_CLOSE_FLOW_ENABLED` required in addition to dual-offer compare.
3. Detach only the PM saved on this reservation (never other customer PMs).
4. Close-flow-owned reservations excluded from reservation-expiry cron.
5. Switch-to-direct keeps `/checkout?pallet_close_switch=…` redirect; new
   quote + explicit acceptance; unreachable when
   `DIRECT_BOX_CHECKOUT_ENABLED` is false.
