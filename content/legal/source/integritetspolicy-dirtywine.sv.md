# Integritetspolicy för Dirty Wine

Personuppgiftsansvarig är Axel Samuelson (enskild firma), Stockholm[, ADRESS]. Kontakt: axel@dirtywine.se.

`[, ADRESS]` styrs av env `DIRTYWINE_LEGAL_ADDRESS` och utelämnas helt om den saknas.

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
| Vercel | Hosting och webbstatistik | Sverige (arn1) / USA | `vercel.json` `regions: ["arn1"]`; `package.json` `@vercel/analytics`; `components/analytics/root-analytics-deferred.tsx` i `app/layout.tsx` |
| Supabase | Databas, autentisering och lagring av användarhändelser | Sverige (eu-north-1) | `package.json` `@supabase/*`; `NEXT_PUBLIC_SUPABASE_URL`; projektregion `eu-north-1`; `lib/analytics/event-tracker.ts` → `user_events` |

Uppgifterna säljs aldrig.

**Ej medtagna (saknar Dirty Wine-specifik beläggning för kontaktperson-PII):** Resend (`RESEND_API_KEY` / `lib/email.ts`) används i den delade plattformen för PACT-transaktionsmail; Dirty Wine-lösenordsåterställning går via Supabase Auth (`app/api/auth/forgot-password/route.ts`). Stripe/Budbee är PACT B2C-flöden.

## Dina rättigheter

Du har rätt till tillgång, rättelse, radering, begränsning och invändning, och rätt till dataportabilitet. Mejla axel@dirtywine.se. Du kan klaga hos Integritetsskyddsmyndigheten (imy.se).

Senast uppdaterad: 31 oktober 2026
