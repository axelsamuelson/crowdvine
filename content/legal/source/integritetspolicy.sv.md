# Integritetspolicy

> **UTKAST, ej publiceringsklar.** Framtaget av Daniel Holm (Compliance) med juridisk ram från Sofia Bergström (GC). Ska granskas av extern jurist innan publicering. Alla fält markerade `[FYLL I]` måste fyllas i, och alla punkter markerade **ÖPPEN FRÅGA** måste avgöras, innan sidan går live.

Senast uppdaterad: [FYLL I DATUM]

---

## 1. Vem ansvarar för dina personuppgifter

EURPACT OÜ är personuppgiftsansvarig för behandlingen av personuppgifter på pactwines.com.

| | |
|---|---|
| Bolag | EURPACT OÜ |
| Registreringsnummer | 17538270 |
| Adress | [FYLL I REGISTRERAD ADRESS I ESTLAND] |
| E-post | [FYLL I. **Får inte vara noreply@pactwines.com.** Måste vara en bevakad adress, GDPR kräver en fungerande kanal för att utöva sina rättigheter] |
| Registrerad distansförsäljare av alkohol hos Skatteverket | [FYLL I REGISTRERINGSNUMMER] |

EURPACT OÜ är ett bolag registrerat inom EU och omfattas av dataskyddsförordningen (GDPR).

**ÖPPEN FRÅGA:** Dirty Wine AB (B2B mot restauranger och barer) är en separat personuppgiftsansvarig för sin egen kunddata. Om B2B-kunder registreras via samma plattform behöver den behandlingen antingen beskrivas här som separat ansvarig, eller regleras i ett gemensamt personuppgiftsansvar enligt artikel 26. Avgörs innan B2B-flödet läggs på plattformen.

---

## 2. Vilka uppgifter vi behandlar

**Uppgifter du lämnar själv**

- Namn, e-postadress, telefonnummer
- Leverans- och fakturaadress
- Födelsedatum eller åldersuppgift (för lagstadgad ålderskontroll)
- Smakpreferenser om du gör vår smakprofil
- Innehåll i meddelanden du skickar till oss

**Uppgifter som skapas när du använder tjänsten**

- Beställningar, reservationer och orderhistorik
- Betalstatus och de sista fyra siffrorna samt korttyp för ditt betalkort
- Leveransstatus och utfall av ID-kontroll vid leverans
- Inloggnings- och kontouppgifter
- Teknisk information: IP-adress, enhetstyp, webbläsare, besökta sidor

Vi behandlar inte känsliga personuppgifter enligt artikel 9 GDPR.

**Vi lagrar aldrig fullständiga kortnummer.** Betaluppgifter hanteras av Stripe, se avsnitt 5.

---

## 3. Varför vi behandlar uppgifterna och med vilken laglig grund

| Ändamål | Uppgifter | Laglig grund | Lagringstid |
|---|---|---|---|
| Hantera din beställning och leverans | Namn, adress, kontaktuppgifter, orderdata | Fullgörande av avtal, art. 6.1 b | Under avtalstiden, därefter enligt bokföringskrav nedan |
| Hantera ditt konto och inloggning | Kontouppgifter, e-post | Fullgörande av avtal, art. 6.1 b | Tills du raderar kontot |
| Lagstadgad ålderskontroll (20 år) | Åldersuppgift, utfall av ID-kontroll vid leverans | Rättslig förpliktelse, art. 6.1 c (alkohollagen) | [FYLL I, förslag: 12 månader efter leverans] |
| Bokföring och skatteredovisning | Transaktions- och orderdata | Rättslig förpliktelse, art. 6.1 c | 7 år |
| Deklaration av svensk alkoholskatt och moms | Leveransdata per order | Rättslig förpliktelse, art. 6.1 c | 7 år |
| Hantera reklamationer, returer och ångerrätt | Order- och kontaktuppgifter | Fullgörande av avtal och rättslig förpliktelse | 3 år från leverans (konsumentköplagen) |
| Kundtjänst och support | Meddelanden, orderdata | Berättigat intresse, art. 6.1 f | [FYLL I, förslag: 24 månader] |
| Drift, säkerhet och felsökning av plattformen | Teknisk data, loggar | Berättigat intresse, art. 6.1 f | [FYLL I, förslag: 12 månader] |
| Statistik om hur plattformen används | Aggregerad användningsdata | Berättigat intresse, art. 6.1 f | [FYLL I] |
| Nyhetsbrev och erbjudanden via e-post | Namn, e-post | Samtycke, art. 6.1 a. **Endast efter din uttryckliga anmälan**, aldrig automatiskt för att du handlat hos oss | Tills du återkallar samtycket |
| Smakprofil och rekommendationer | Smakpreferenser | Samtycke, art. 6.1 a | Tills du raderar profilen |

**Avgjort av Sofia 25 augusti 2026.** Undantaget för befintlig kundrelation i 21 § marknadsföringslagen gäller inte här. Konsumentverkets allmänna råd utgår från att direktreklam för alkohol är oförenlig med alkohollagens krav på särskild måttfullhet, med undantag för när konsumenten uttryckligen begärt informationen. Nyhetsbrev kräver därför aktiv anmälan. Transaktionsmail är inte marknadsföring och berörs inte.

**Berättigat intresse.** Där vi stödjer oss på berättigat intresse har vi vägt vårt intresse av att driva och säkra tjänsten mot din rätt till integritet. Du kan invända mot sådan behandling, se avsnitt 7.

---

## 4. Automatiserat beslutsfattande

Vi fattar inga beslut om dig som enbart grundas på automatiserad behandling och som har rättsliga följder för dig.

**ÖPPEN FRÅGA:** Om åldersspärren vid kassan avvisar en beställning helt automatiskt behöver den bedömas mot artikel 22. Den ryms sannolikt inom undantaget för behandling som krävs enligt lag, men slutsatsen ska fastställas av Sofia innan denna mening låses.

---

## 5. Vilka vi delar uppgifter med

Vi säljer aldrig dina personuppgifter. Vi delar dem med följande kategorier av mottagare.

| Mottagare | Roll | Vad de får | Var behandlingen sker | DPA på plats |
|---|---|---|---|---|
| Stripe | Personuppgiftsbiträde, betalningar | Namn, e-post, betaluppgifter, orderbelopp | EU/USA | [BEKRÄFTA] |
| Supabase | Personuppgiftsbiträde, databas och autentisering | Konto- och orderdata | [FYLL I REGION] | [BEKRÄFTA] |
| Vercel | Personuppgiftsbiträde, hosting | Teknisk data, loggar | EU/USA | [BEKRÄFTA] |
| Resend | Personuppgiftsbiträde, transaktionsmail | Namn, e-post | [FYLL I] | [BEKRÄFTA] |
| Instabee | Självständigt ansvarig eller biträde, hemleverans med ID-kontroll | Namn, adress, telefon, ordernummer | Sverige | [BEKRÄFTA ROLL OCH AVTAL] |
| Producenter i Frankrike | Personuppgiftsbiträde, packning och etikettering av din order | Namn, leveransadress, ordernummer | Frankrike | [BEKRÄFTA, avtal saknas idag] |
| Fraktpartner för palltransport | Personuppgiftsbiträde eller självständigt ansvarig | Leveransunderlag | Frankrike, Sverige | [BEKRÄFTA] |
| Skatteverket och andra myndigheter | Mottagare enligt lag | Leverans- och skatteunderlag | Sverige | Ej tillämpligt |
| Revisor och bokföringstjänst | Personuppgiftsbiträde | Transaktionsdata | [FYLL I] | [BEKRÄFTA] |

**Anmärkning till Sofia:** Att B2C-ordrar packas och etiketteras av producenten i Frankrike innebär att svenska konsumenters namn och adress lämnar PACT:s system och hanteras av småskaliga producenter utan egen dataskyddsorganisation. Detta är den mest sannolika svaga punkten i kedjan vid en granskning. Ett databehandlingsavtal per producent behövs, och bör bakas in i det producentramavtal som ändå saknas.

### Överföring till tredjeland

Vissa av våra leverantörer kan behandla uppgifter utanför EU/EES. Sådana överföringar sker med stöd av EU-kommissionens standardavtalsklausuler eller ett beslut om adekvat skyddsnivå. [FYLL I VILKEN GRUND SOM GÄLLER PER LEVERANTÖR]

---

## 6. Hur länge vi sparar uppgifterna

Lagringstider framgår av tabellen i avsnitt 3. När ändamålet upphört raderas eller anonymiseras uppgifterna, med undantag för det som vi enligt lag måste behålla, i första hand bokförings- och skatteunderlag i 7 år.

---

## 7. Dina rättigheter

Du har rätt att:

- **Få tillgång** till de uppgifter vi behandlar om dig
- **Få felaktiga uppgifter rättade**
- **Få uppgifter raderade**, när vi inte har en rättslig skyldighet eller ett avtal som kräver att vi behåller dem
- **Begära begränsning** av behandlingen
- **Invända** mot behandling som grundas på berättigat intresse
- **Få ut dina uppgifter** i ett maskinläsbart format och överföra dem till någon annan
- **Återkalla ditt samtycke** när som helst, utan att det påverkar behandling som redan skett

Kontakta oss på [FYLL I E-POST]. Vi svarar inom en månad från att begäran kommit in.

Observera att en begäran om radering inte omfattar orderhistorik och betalunderlag som vi måste spara enligt bokföringslagen och för att kunna redovisa alkoholskatt.

---

## 8. Klagomål till tillsynsmyndighet

EURPACT OÜ är etablerat i Estland och står under tillsyn av Andmekaitse Inspektsioon (estniska Dataskyddsinspektionen), www.aki.ee.

Du kan också vända dig till Integritetsskyddsmyndigheten (IMY) i Sverige, imy.se, som då förmedlar ärendet vidare.

---

## 9. Cookies

Vi använder cookies och liknande tekniker. Läs mer i vår [cookiepolicy](/cookies).

---

## 10. Ändringar

Vi kan komma att uppdatera denna policy. Den senaste versionen finns alltid på pactwines.com/integritetspolicy. Vid väsentliga ändringar informerar vi dig via e-post eller på webbplatsen.
