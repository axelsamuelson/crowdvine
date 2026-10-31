# Dirtywine inquiry — response time copy

Customer-facing follow-up wording changed from «så snart vi kan» to **«inom 1 arbetsdag»**.

## Source of truth

- `lib/b2b/brand.ts` → `DIRTYWINE_INQUIRY_FOLLOW_UP` (SV; receipt + kundmejl HTML/text)
- `lib/b2b/inquiry-copy.ts` → EN `successBody` / `emailBodyCustomer`

## Artifacts (Host: dirtywine.se)

| File | What |
| --- | --- |
| `receipt-success-390.png` | Kvittosida efter skickad förfrågan, 390 px |
| `customer-confirmation-email.png` | Kundbekräftelsemejl (HTML från `buildB2bInquiryCustomerEmail`) |
| `customer-confirmation.html` | Rå HTML från email builder |
| `customer-confirmation.txt` | Rå text från email builder |

Capture: `NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE=inquiry` + Next on `:3000`, then `node scripts/dirtywine-response-time-screenshots.mjs`.
