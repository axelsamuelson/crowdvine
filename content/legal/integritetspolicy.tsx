import {
  LegalH2,
  LegalH3,
  LegalLink,
  LegalList,
  LegalP,
  LegalProse,
  LegalStrong,
  LegalTable,
  LegalTd,
  LegalTh,
} from "@/components/legal/legal-prose";

export default function IntegritetspolicyContent() {
  return (
    <LegalProse>
      <LegalH2>1. Vem ansvarar för dina personuppgifter</LegalH2>
      <LegalP>
        EURPACT OÜ är personuppgiftsansvarig för behandlingen av
        personuppgifter på pactwines.com.
      </LegalP>
      <LegalTable>
        <tbody>
          <tr>
            <LegalTh>Bolag</LegalTh>
            <LegalTd>EURPACT OÜ</LegalTd>
          </tr>
          <tr>
            <LegalTh>Registreringsnummer</LegalTh>
            <LegalTd>17538270</LegalTd>
          </tr>
          <tr>
            <LegalTh>Adress</LegalTh>
            <LegalTd>[FYLL I REGISTRERAD ADRESS I ESTLAND]</LegalTd>
          </tr>
          <tr>
            <LegalTh>E-post</LegalTh>
            <LegalTd>[FYLL I]</LegalTd>
          </tr>
          <tr>
            <LegalTh>Registrerad distansförsäljare av alkohol hos Skatteverket</LegalTh>
            <LegalTd>[FYLL I REGISTRERINGSNUMMER]</LegalTd>
          </tr>
        </tbody>
      </LegalTable>
      <LegalP>
        EURPACT OÜ är ett bolag registrerat inom EU och omfattas av
        dataskyddsförordningen (GDPR).
      </LegalP>

      <LegalH2>2. Vilka uppgifter vi behandlar</LegalH2>
      <LegalH3>Uppgifter du lämnar själv</LegalH3>
      <LegalList>
        <li>Namn, e-postadress, telefonnummer</li>
        <li>Leverans- och fakturaadress</li>
        <li>Födelsedatum eller åldersuppgift (för lagstadgad ålderskontroll)</li>
        <li>Smakpreferenser om du gör vår smakprofil</li>
        <li>Innehåll i meddelanden du skickar till oss</li>
      </LegalList>
      <LegalH3>Uppgifter som skapas när du använder tjänsten</LegalH3>
      <LegalList>
        <li>Beställningar, reservationer och orderhistorik</li>
        <li>
          Betalstatus och de sista fyra siffrorna samt korttyp för ditt
          betalkort
        </li>
        <li>Leveransstatus och utfall av ID-kontroll vid leverans</li>
        <li>Inloggnings- och kontouppgifter</li>
        <li>Teknisk information: IP-adress, enhetstyp, webbläsare, besökta sidor</li>
      </LegalList>
      <LegalP>
        Vi behandlar inte känsliga personuppgifter enligt artikel 9 GDPR.
      </LegalP>
      <LegalP>
        <LegalStrong>Vi lagrar aldrig fullständiga kortnummer.</LegalStrong>{" "}
        Betaluppgifter hanteras av Stripe, se avsnitt 5.
      </LegalP>

      <LegalH2>3. Varför vi behandlar uppgifterna och med vilken laglig grund</LegalH2>
      <LegalTable>
        <thead>
          <tr>
            <LegalTh>Ändamål</LegalTh>
            <LegalTh>Uppgifter</LegalTh>
            <LegalTh>Laglig grund</LegalTh>
            <LegalTh>Lagringstid</LegalTh>
          </tr>
        </thead>
        <tbody>
          <tr>
            <LegalTd>Hantera din beställning och leverans</LegalTd>
            <LegalTd>Namn, adress, kontaktuppgifter, orderdata</LegalTd>
            <LegalTd>Fullgörande av avtal, art. 6.1 b</LegalTd>
            <LegalTd>
              Under avtalstiden, därefter enligt bokföringskrav nedan
            </LegalTd>
          </tr>
          <tr>
            <LegalTd>Hantera ditt konto och inloggning</LegalTd>
            <LegalTd>Kontouppgifter, e-post</LegalTd>
            <LegalTd>Fullgörande av avtal, art. 6.1 b</LegalTd>
            <LegalTd>Tills du raderar kontot</LegalTd>
          </tr>
          <tr>
            <LegalTd>Lagstadgad ålderskontroll (20 år)</LegalTd>
            <LegalTd>Åldersuppgift, utfall av ID-kontroll vid leverans</LegalTd>
            <LegalTd>Rättslig förpliktelse, art. 6.1 c (alkohollagen)</LegalTd>
            <LegalTd>[FYLL I, förslag: 12 månader efter leverans]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Bokföring och skatteredovisning</LegalTd>
            <LegalTd>Transaktions- och orderdata</LegalTd>
            <LegalTd>Rättslig förpliktelse, art. 6.1 c</LegalTd>
            <LegalTd>7 år</LegalTd>
          </tr>
          <tr>
            <LegalTd>Deklaration av svensk alkoholskatt och moms</LegalTd>
            <LegalTd>Leveransdata per order</LegalTd>
            <LegalTd>Rättslig förpliktelse, art. 6.1 c</LegalTd>
            <LegalTd>7 år</LegalTd>
          </tr>
          <tr>
            <LegalTd>Hantera reklamationer, returer och ångerrätt</LegalTd>
            <LegalTd>Order- och kontaktuppgifter</LegalTd>
            <LegalTd>
              Fullgörande av avtal och rättslig förpliktelse
            </LegalTd>
            <LegalTd>3 år från leverans (konsumentköplagen)</LegalTd>
          </tr>
          <tr>
            <LegalTd>Kundtjänst och support</LegalTd>
            <LegalTd>Meddelanden, orderdata</LegalTd>
            <LegalTd>Berättigat intresse, art. 6.1 f</LegalTd>
            <LegalTd>[FYLL I, förslag: 24 månader]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Drift, säkerhet och felsökning av plattformen</LegalTd>
            <LegalTd>Teknisk data, loggar</LegalTd>
            <LegalTd>Berättigat intresse, art. 6.1 f</LegalTd>
            <LegalTd>[FYLL I, förslag: 12 månader]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Statistik om hur plattformen används</LegalTd>
            <LegalTd>Aggregerad användningsdata</LegalTd>
            <LegalTd>Berättigat intresse, art. 6.1 f</LegalTd>
            <LegalTd>[FYLL I]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Nyhetsbrev och erbjudanden via e-post</LegalTd>
            <LegalTd>Namn, e-post</LegalTd>
            <LegalTd>
              Samtycke, art. 6.1 a.{" "}
              <LegalStrong>
                Endast efter din uttryckliga anmälan
              </LegalStrong>
              , aldrig automatiskt för att du handlat hos oss
            </LegalTd>
            <LegalTd>Tills du återkallar samtycket</LegalTd>
          </tr>
          <tr>
            <LegalTd>Smakprofil och rekommendationer</LegalTd>
            <LegalTd>Smakpreferenser</LegalTd>
            <LegalTd>Samtycke, art. 6.1 a</LegalTd>
            <LegalTd>Tills du raderar profilen</LegalTd>
          </tr>
        </tbody>
      </LegalTable>
      <LegalP>
        <LegalStrong>Berättigat intresse.</LegalStrong> Där vi stödjer oss på
        berättigat intresse har vi vägt vårt intresse av att driva och säkra
        tjänsten mot din rätt till integritet. Du kan invända mot sådan
        behandling, se avsnitt 7.
      </LegalP>

      <LegalH2>4. Automatiserat beslutsfattande</LegalH2>
      <LegalP>
        Vi fattar inga beslut om dig som enbart grundas på automatiserad
        behandling och som har rättsliga följder för dig.
      </LegalP>

      <LegalH2>5. Vilka vi delar uppgifter med</LegalH2>
      <LegalP>
        Vi säljer aldrig dina personuppgifter. Vi delar dem med följande
        kategorier av mottagare.
      </LegalP>
      <LegalTable>
        <thead>
          <tr>
            <LegalTh>Mottagare</LegalTh>
            <LegalTh>Roll</LegalTh>
            <LegalTh>Vad de får</LegalTh>
            <LegalTh>Var behandlingen sker</LegalTh>
            <LegalTh>DPA på plats</LegalTh>
          </tr>
        </thead>
        <tbody>
          <tr>
            <LegalTd>Stripe</LegalTd>
            <LegalTd>Personuppgiftsbiträde, betalningar</LegalTd>
            <LegalTd>Namn, e-post, betaluppgifter, orderbelopp</LegalTd>
            <LegalTd>EU/USA</LegalTd>
            <LegalTd>[BEKRÄFTA]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Supabase</LegalTd>
            <LegalTd>Personuppgiftsbiträde, databas och autentisering</LegalTd>
            <LegalTd>Konto- och orderdata</LegalTd>
            <LegalTd>[FYLL I REGION]</LegalTd>
            <LegalTd>[BEKRÄFTA]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Vercel</LegalTd>
            <LegalTd>Personuppgiftsbiträde, hosting</LegalTd>
            <LegalTd>Teknisk data, loggar</LegalTd>
            <LegalTd>EU/USA</LegalTd>
            <LegalTd>[BEKRÄFTA]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Resend</LegalTd>
            <LegalTd>Personuppgiftsbiträde, transaktionsmail</LegalTd>
            <LegalTd>Namn, e-post</LegalTd>
            <LegalTd>[FYLL I]</LegalTd>
            <LegalTd>[BEKRÄFTA]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Instabee</LegalTd>
            <LegalTd>
              Självständigt ansvarig eller biträde, hemleverans med
              ID-kontroll
            </LegalTd>
            <LegalTd>Namn, adress, telefon, ordernummer</LegalTd>
            <LegalTd>Sverige</LegalTd>
            <LegalTd>[BEKRÄFTA ROLL OCH AVTAL]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Producenter i Frankrike</LegalTd>
            <LegalTd>
              Personuppgiftsbiträde, packning och etikettering av din order
            </LegalTd>
            <LegalTd>Namn, leveransadress, ordernummer</LegalTd>
            <LegalTd>Frankrike</LegalTd>
            <LegalTd>[BEKRÄFTA, avtal saknas idag]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Fraktpartner för palltransport</LegalTd>
            <LegalTd>Personuppgiftsbiträde eller självständigt ansvarig</LegalTd>
            <LegalTd>Leveransunderlag</LegalTd>
            <LegalTd>Frankrike, Sverige</LegalTd>
            <LegalTd>[BEKRÄFTA]</LegalTd>
          </tr>
          <tr>
            <LegalTd>Skatteverket och andra myndigheter</LegalTd>
            <LegalTd>Mottagare enligt lag</LegalTd>
            <LegalTd>Leverans- och skatteunderlag</LegalTd>
            <LegalTd>Sverige</LegalTd>
            <LegalTd>Ej tillämpligt</LegalTd>
          </tr>
          <tr>
            <LegalTd>Revisor och bokföringstjänst</LegalTd>
            <LegalTd>Personuppgiftsbiträde</LegalTd>
            <LegalTd>Transaktionsdata</LegalTd>
            <LegalTd>[FYLL I]</LegalTd>
            <LegalTd>[BEKRÄFTA]</LegalTd>
          </tr>
        </tbody>
      </LegalTable>

      <LegalH3>Överföring till tredjeland</LegalH3>
      <LegalP>
        Vissa av våra leverantörer kan behandla uppgifter utanför EU/EES.
        Sådana överföringar sker med stöd av EU-kommissionens
        standardavtalsklausuler eller ett beslut om adekvat skyddsnivå. [FYLL I
        VILKEN GRUND SOM GÄLLER PER LEVERANTÖR]
      </LegalP>

      <LegalH2>6. Hur länge vi sparar uppgifterna</LegalH2>
      <LegalP>
        Lagringstider framgår av tabellen i avsnitt 3. När ändamålet upphört
        raderas eller anonymiseras uppgifterna, med undantag för det som vi
        enligt lag måste behålla, i första hand bokförings- och
        skatteunderlag i 7 år.
      </LegalP>

      <LegalH2>7. Dina rättigheter</LegalH2>
      <LegalP>Du har rätt att:</LegalP>
      <LegalList>
        <li>
          <LegalStrong>Få tillgång</LegalStrong> till de uppgifter vi
          behandlar om dig
        </li>
        <li>
          <LegalStrong>Få felaktiga uppgifter rättade</LegalStrong>
        </li>
        <li>
          <LegalStrong>Få uppgifter raderade</LegalStrong>, när vi inte har
          en rättslig skyldighet eller ett avtal som kräver att vi behåller
          dem
        </li>
        <li>
          <LegalStrong>Begära begränsning</LegalStrong> av behandlingen
        </li>
        <li>
          <LegalStrong>Invända</LegalStrong> mot behandling som grundas på
          berättigat intresse
        </li>
        <li>
          <LegalStrong>Få ut dina uppgifter</LegalStrong> i ett
          maskinläsbart format och överföra dem till någon annan
        </li>
        <li>
          <LegalStrong>Återkalla ditt samtycke</LegalStrong> när som helst,
          utan att det påverkar behandling som redan skett
        </li>
      </LegalList>
      <LegalP>
        Kontakta oss på [FYLL I E-POST]. Vi svarar inom en månad från att
        begäran kommit in.
      </LegalP>
      <LegalP>
        Observera att en begäran om radering inte omfattar orderhistorik och
        betalunderlag som vi måste spara enligt bokföringslagen och för att
        kunna redovisa alkoholskatt.
      </LegalP>

      <LegalH2>8. Klagomål till tillsynsmyndighet</LegalH2>
      <LegalP>
        EURPACT OÜ är etablerat i Estland och står under tillsyn av Andmekaitse
        Inspektsioon (estniska Dataskyddsinspektionen), www.aki.ee.
      </LegalP>
      <LegalP>
        Du kan också vända dig till Integritetsskyddsmyndigheten (IMY) i
        Sverige, imy.se, som då förmedlar ärendet vidare.
      </LegalP>

      <LegalH2>9. Cookies</LegalH2>
      <LegalP>
        Vi använder cookies och liknande tekniker. Läs mer i vår{" "}
        <LegalLink href="/cookies">cookiepolicy</LegalLink>.
      </LegalP>

      <LegalH2>10. Ändringar</LegalH2>
      <LegalP>
        Vi kan komma att uppdatera denna policy. Den senaste versionen finns
        alltid på pactwines.com/integritetspolicy. Vid väsentliga ändringar
        informerar vi dig via e-post eller på webbplatsen.
      </LegalP>
    </LegalProse>
  );
}
