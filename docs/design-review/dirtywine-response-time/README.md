# Dirtywine inquiry — response time + Inès copy

## Copy

| Yta | Sträng |
| --- | --- |
| Svarstid (SV) | `Vi återkommer med bekräftelse och faktura inom en arbetsdag.` |
| Svarstid (EN) | `…within 1 business day.` (oförändrad) |
| Kvitto integritet | `Vi behandlar dina uppgifter för att hantera förfrågan. Läs mer i vår` + länk `integritetspolicy` → `/integritetspolicy` |
| Mejl hälsning | `Hälsningar, Dirty Wine` |
| Mejl sidfot | `Dirty Wine drivs av …` |
| From-header | `Dirtywine <noreply@pactwines.com>` (Axel — oförändrad) |

## Source of truth

- `lib/b2b/brand.ts` — `DIRTYWINE_INQUIRY_FOLLOW_UP`, `DIRTYWINE_EMAIL_BODY_BRAND`, footer/sign-off
- `lib/b2b/inquiry-copy.ts` — privacy note + EN follow-up
- `lib/b2b/inquiry-emails.ts` — customer HTML/text builders
- `lib/b2b/email-from.ts` — From header (Dirtywine)

## Artifacts (Host: dirtywine.se)

| File | What |
| --- | --- |
| `receipt-success-390.png` | Kvittosida 390 px |
| `customer-confirmation-email.png` | Kundbekräftelsemejl |
| `customer-confirmation.html` / `.txt` | Rå output från email builder |

Capture: `NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE=inquiry` + Next on `:3000`, then `node scripts/dirtywine-response-time-screenshots.mjs`.
