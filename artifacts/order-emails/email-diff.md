# Order email copy — before / after (Axel 2026-11-10)

PACT customer-visible email text only. Analytics event names and DB columns unchanged.

Domain: **pactwines.com** everywhere (fixed `pact.wine`).

---

## 1. Status / extension (lib/reservations/expiry-emails.ts)

### Before (SV)
**Ämne:** Vill du ge din PACT-reservation 30 dagar till?

> Din reservation hos PACT har nu gällt i 30 dagar… Enligt köpvillkoren (punkt 3) gäller en reservation i 30 dagar åt gången. Bekräfta senast {deadline}…
> När du bekräftar gäller reservationen i 30 dagar till… Om du inte bekräftar avslutas reservationen automatiskt…

CTA: Ge reservationen 30 dagar till

### After (SV)
**Ämne:** Läget för din PACT-pall

> Hej {namn},
>
> Din order {ordernr} väntar fortfarande på att pallen ska fyllas. Just nu är {antal} av {grans} flaskor beställda.
>
> Du behöver inte göra något. Din order ligger kvar tills pallen stänger, och först då dras {belopp} från ditt sparade kort. Vi mejlar dig när det händer.
>
> Vill du inte vänta längre kan du avbryta utan kostnad fram till att pallen stänger.
>
> [Se din order]  [Avbryt ordern]
>
> EURPACT OÜ, säljare på pactwines.com · customer@pactwines.com

### Before (EN)
**Subject:** Do you want to give your PACT reservation 30 more days?

> Your reservation with PACT has now been in effect for 30 days… Under the terms of purchase (section 3)… If you do not confirm, the reservation ends automatically…

### After (EN)
**Subject:** An update on your PACT pallet

> Hi {namn},
>
> Your order {ordernr} is still waiting for the pallet to fill. Right now {antal} of {grans} bottles have been ordered.
>
> You don't need to do anything. Your order stays in place until the pallet closes, and only then will {belopp} be charged to your saved card. We'll email you when that happens.
>
> If you'd rather not wait, you can cancel free of charge until the pallet closes.
>
> [View your order]  [Cancel order]
>
> EURPACT OÜ, seller at pactwines.com · customer@pactwines.com

**Logic:** Cadence every **4 weeks** per order (`pallet_status_update_{periodDay}` idempotent). No auto-cancel for no reply. No hard max-age cancel. Legacy extension links show a friendly “no action needed” page.

---

## 2. Cancellation confirmation (lib/checkout/pallet-close/emails.ts)

### Before (SV)
**Ämne:** Reservation avbokad — ingen debitering  
> … Ingen debitering har skett och det sparade kortet har kopplats bort.

### After (SV)
**Ämne:** Din order är avbruten – inget har dragits

> Hej {namn},
>
> Vi har avbrutit din order {ordernr} som du bad om. Inget belopp har dragits från ditt kort, och det sparade kortet är borttaget.
>
> Vill du vara med på en kommande pall hittar du dem på pactwines.com.
>
> EURPACT OÜ · customer@pactwines.com

### Before (EN)
**Subject:** Reservation cancelled — no charge

### After (EN)
**Subject:** Your order has been cancelled – nothing was charged

> Hi {namn},
>
> We have cancelled your order {ordernr} as you asked. Nothing was charged to your card, and the saved card has been removed.
>
> If you'd like to join a future pallet, you'll find them at pactwines.com.
>
> EURPACT OÜ · customer@pactwines.com

---

## 3. Failed charge (lib/sendgrid-service.ts + pallet-close payment-failed)

### Before (EN only)
**Subject:** Action required — payment failed for your PACT order  
> We will automatically retry your payment in {retryHours} hours.  
> retryHours **24 | 72** (`lib/payment-retry.ts` `MS_24H`/`MS_72H`, webhook `nextAttempts === 1 ? 24 : 72`, cancel when `attemptNumber >= 3`).

Domain bug: `pact.wine` in cancelled email.

### After (SV)
**Ämne:** Vi kunde inte dra betalningen för din order

> Hej {namn},
>
> Pallen för din order {ordernr} har stängt, men vi kunde inte dra {belopp} från ditt kort.
>
> Du har till och med {datum} (3 dagar) på dig att betala… Vi försöker också dra beloppet igen under tiden.
>
> Har betalningen inte gått igenom senast {datum} avbryts ordern och inget dras.
>
> [Betala nu]
>
> EURPACT OÜ · customer@pactwines.com

### After (EN)
**Subject:** We couldn't take payment for your order

> Hi {namn},
>
> The pallet for your order {ordernr} has closed, but we couldn't charge {belopp} to your card.
>
> You have until {datum} (3 days) to pay… We'll also try the charge again in the meantime.
>
> If payment hasn't gone through by {datum}, the order will be cancelled and nothing will be charged.
>
> [Pay now]
>
> EURPACT OÜ · customer@pactwines.com

**Logic:** 3-day pay window from first failure (`PAYMENT_RETRY_PAY_WINDOW_MS`); retries every 24h inside the window; then end the order. Window stored on existing `offsession_charge_failed_at` / `offsession_pay_by` (no new migration).

---

## 4. reservation → köp / order (audit list)

| File | Change |
| --- | --- |
| `lib/reservations/expiry-emails.ts` | status email uses “order” / “köp” framing |
| `lib/checkout/pallet-close/emails.ts` | footer `Order ${id}`; CTA Visa/View order; cancel + failed subjects |
| `lib/checkout/pallet-delivery-notify/emails.ts` | footer Order; CTA Visa/View order |
| `lib/sendgrid-service.ts` | order wording; View your order CTA; SV+EN failed/cancelled |
| `lib/email/pallet-complete.ts` | Your order |
| `lib/exit-discount/email.ts` | “första köp” |
| `lib/email/admin-email-preview.ts` / samples | subjects aligned |
| `app/pallet-close/cancel/page.tsx` | order cancelled copy |

Left alone: analytics event names, DB columns, URL paths like `/profile/reservations`.
