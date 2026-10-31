# Integritetspolicy

H1: Integritetspolicy (enda H1). Ingen H2 med samma titel.

Den här policyn gäller dirtywine.se. Personuppgiftsansvarig är Axel Samuelson (enskild firma), Stockholm[, ADRESS]. Kontakt: axel@dirtywine.se (mailto).

`[, ADRESS]` styrs av env `DIRTYWINE_LEGAL_ADDRESS` och utelämnas helt om den saknas.

Senast uppdaterad visas bara i sidhuvudet (LegalPageLayout), inte i brödtexten.

## Vilka uppgifter vi behandlar

Uppgifter om dig som kontaktperson hos en restaurang eller bar: namn, e-post, telefon, roll och företag samt dina förfrågningar och beställningar. Inloggningsuppgifter för ditt konto.

## Varför och med vilken rättslig grund

- För att hantera konto, förfrågningar och leveranser. Grunden är avtal med företaget och vårt berättigade intresse av att kunna ha kontakt med dess personal.
- För att kontakta krogar om vårt sortiment och om provningar. Grunden är berättigat intresse, och du kan när som helst säga nej genom att svara på ett mejl.
- För bokföring och alkoholskatt. Grunden är rättslig förpliktelse.

## Hur länge

Kontouppgifter sparas så länge kontot finns. Kontaktuppgifter för försäljning sparas i högst 2 år efter senaste kontakt. Bokföringsunderlag sparas i 7 år.

## Mottagare

Leverantörer som driver tjänsten för vår räkning (belagda i koden):

| Tjänst | Syfte | Land | Källa |
| --- | --- | --- | --- |
| Vercel | Hosting och webbstatistik | Sverige (arn1) / USA | `vercel.json` `regions: ["arn1"]`; `package.json` `@vercel/analytics`; `components/analytics/root-analytics-deferred.tsx` i `app/layout.tsx`. Vercel DPA: primär behandling i USA. |
| Supabase | Databas, autentisering och lagring av användarhändelser | Sverige (eu-north-1) | `package.json` `@supabase/*`; `NEXT_PUBLIC_SUPABASE_URL`; projektregion `eu-north-1`; `lib/analytics/event-tracker.ts` → `user_events` |
| Resend | Utskick av bekräftelse- och kontomejl | USA | `package.json` `resend`; `RESEND_API_KEY` / `lib/email.ts`; Dirty Wine inquiry-bekräftelse via Resend i PR #116 (`lib/b2b/inquiry-emails.ts` → `sendEmail`). Resend lagrar kunddata i USA. |

Uppgifterna säljs aldrig.

Vid överföring till USA används EU–US Data Privacy Framework eller EU:s standardavtalsklausuler, beroende på leverantör.

**Ej medtagna:** Stripe/Budbee är PACT B2C-flöden.

## Dina rättigheter

Du har rätt till tillgång, rättelse, radering, begränsning och invändning, och rätt till dataportabilitet. Mejla axel@dirtywine.se. Du kan klaga hos Integritetsskyddsmyndigheten (imy.se).

Senast uppdaterad: 31 oktober 2026
