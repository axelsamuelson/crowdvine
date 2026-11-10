import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { buildStatusEmailHtml } from "@/lib/reservations/expiry-emails";
import {
  buildPalletCloseCancelledEmail,
  buildPalletClosedChargedEmail,
} from "@/lib/checkout/pallet-close/emails";
import {
  buildPaymentCancelledHtml,
  buildPaymentFailedHtml,
} from "@/lib/sendgrid-service";
import { buildPalletShippedEmail } from "@/lib/checkout/pallet-delivery-notify/emails";

const outDir = path.join(process.cwd(), "artifacts/order-emails");
mkdirSync(outDir, { recursive: true });

const statusSv = buildStatusEmailHtml({
  locale: "sv",
  customerName: "Anna",
  orderId: "ord-demo-001",
  bottlesOrdered: 120,
  bottlesNeeded: 270,
  amountSek: 1250,
  orderUrl: "https://pactwines.com/profile/reservations",
  cancelUrl: "https://pactwines.com/pallet-close/cancel?token=demo",
});
const statusEn = buildStatusEmailHtml({
  locale: "en",
  customerName: "Alex",
  orderId: "ord-demo-001",
  bottlesOrdered: 120,
  bottlesNeeded: 270,
  amountSek: 1250,
  orderUrl: "https://pactwines.com/profile/reservations",
  cancelUrl: "https://pactwines.com/pallet-close/cancel?token=demo",
});

const cancelSv = buildPalletCloseCancelledEmail({
  locale: "sv",
  customerName: "Anna",
  reservationId: "ord-demo-001",
  reason: "customer_cancel",
}).html;
const cancelEn = buildPalletCloseCancelledEmail({
  locale: "en",
  customerName: "Alex",
  reservationId: "ord-demo-001",
  reason: "customer_cancel",
}).html;

const failSv = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:24px;max-width:600px;margin:0 auto;">${buildPaymentFailedHtml(
  {
    reservationId: "ord-demo-001",
    customerName: "Anna",
    amountSek: 1250,
    payByLabel: "13 november 2026",
    paymentUrl: "https://pactwines.com/profile#payment",
    locale: "sv",
  },
)}</body></html>`;
const failEn = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:24px;max-width:600px;margin:0 auto;">${buildPaymentFailedHtml(
  {
    reservationId: "ord-demo-001",
    customerName: "Alex",
    amountSek: 1250,
    payByLabel: "13 November 2026",
    paymentUrl: "https://pactwines.com/profile#payment",
    locale: "en",
  },
)}</body></html>`;

const payCancelSv = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:24px;max-width:600px;margin:0 auto;">${buildPaymentCancelledHtml(
  {
    reservationId: "ord-demo-001",
    reason: "Betalningen gick inte igenom inom 3 dagar.",
    locale: "sv",
    customerName: "Anna",
  },
)}</body></html>`;
const payCancelEn = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:24px;max-width:600px;margin:0 auto;">${buildPaymentCancelledHtml(
  {
    reservationId: "ord-demo-001",
    reason: "Payment was not completed within 3 days.",
    locale: "en",
    customerName: "Alex",
  },
)}</body></html>`;

const chargedSv = buildPalletClosedChargedEmail({
  locale: "sv",
  customerName: "Anna",
  reservationId: "ord-demo-001",
  amountSek: 1250,
  palletName: "Stockholm A",
}).html;
const chargedEn = buildPalletClosedChargedEmail({
  locale: "en",
  customerName: "Alex",
  reservationId: "ord-demo-001",
  amountSek: 1250,
  palletName: "Stockholm A",
}).html;

const shippedSv = buildPalletShippedEmail({
  locale: "sv",
  customerName: "Anna",
  reservationId: "ord-demo-001",
  windowStart: "12 maj",
  windowEnd: "18 maj",
  palletName: "Stockholm A",
}).html;
const shippedEn = buildPalletShippedEmail({
  locale: "en",
  customerName: "Alex",
  reservationId: "ord-demo-001",
  windowStart: "12 May",
  windowEnd: "18 May",
  palletName: "Stockholm A",
}).html;

const files: Record<string, string> = {
  "status-sv.html": statusSv,
  "status-en.html": statusEn,
  "cancel-confirm-sv.html": cancelSv,
  "cancel-confirm-en.html": cancelEn,
  "failed-charge-sv.html": failSv,
  "failed-charge-en.html": failEn,
  "payment-cancelled-sv.html": payCancelSv,
  "payment-cancelled-en.html": payCancelEn,
  "charged-sv.html": chargedSv,
  "charged-en.html": chargedEn,
  "shipped-sv.html": shippedSv,
  "shipped-en.html": shippedEn,
};

for (const [name, html] of Object.entries(files)) {
  writeFileSync(path.join(outDir, name), html);
}

console.log(`Wrote ${Object.keys(files).length} html files to ${outDir}`);
