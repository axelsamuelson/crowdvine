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
import type { LegalTocItem } from "@/components/legal/legal-page-layout";

/** Section headings for TOC — labels match H2 text exactly (no new copy). */
export const KOPVILLKOR_TOC: LegalTocItem[] = [
  { id: "punkt-1", label: "1. Om oss" },
  { id: "punkt-2", label: "2. Åldersgräns" },
  { id: "punkt-3", label: "3. Så köper du" },
  { id: "punkt-4", label: "4. Priser" },
  { id: "punkt-5", label: "5. Betalning" },
  { id: "punkt-6", label: "6. Beställningsbekräftelse och avtal" },
  { id: "punkt-7", label: "7. Leverans" },
  { id: "punkt-8", label: "8. Om leverans inte kan genomföras" },
  { id: "punkt-9", label: "9. Ångerrätt" },
  { id: "punkt-10", label: "10. Reklamation" },
  { id: "punkt-11", label: "11. Ditt konto" },
  { id: "punkt-12", label: "12. Personuppgifter" },
  { id: "punkt-13", label: "13. Tvist och tillämplig lag" },
  { id: "punkt-14", label: "14. Ändringar av villkoren" },
];

export default function KopvillkorContent() {
  return (
    <LegalProse>
      <LegalH2 id="punkt-1">1. Om oss</LegalH2>
      <LegalP>Din motpart vid köp på pactwines.com är:</LegalP>
      <LegalTable>
        <tbody>
          <tr>
            <LegalTh>Säljare</LegalTh>
            <LegalTd>EURPACT OÜ</LegalTd>
          </tr>
          <tr>
            <LegalTh>Registreringsnummer</LegalTh>
            <LegalTd>17538270</LegalTd>
          </tr>
          <tr>
            <LegalTh>Adress</LegalTh>
            <LegalTd>
              Tartu mnt 67/1-13b, Kesklinna linnaosa, 10115 Tallinn, Harju
              maakond, Estland
            </LegalTd>
          </tr>
          <tr>
            <LegalTh>E-post</LegalTh>
            <LegalTd>customer@pactwines.com</LegalTd>
          </tr>
          <tr>
            <LegalTh>Registrerad som distansförsäljare av alkohol hos Skatteverket</LegalTh>
            <LegalTd>[FYLL I REGISTRERINGSNUMMER]</LegalTd>
          </tr>
        </tbody>
      </LegalTable>
      <LegalP>
        EURPACT OÜ är ett estniskt bolag och säljer alkohol på distans till
        konsumenter i Sverige. EURPACT OÜ redovisar och betalar svensk
        alkoholskatt och svensk moms för varje leverans.
      </LegalP>

      <LegalH2 id="punkt-2">2. Åldersgräns</LegalH2>
      <LegalP>
        <LegalStrong>Du måste ha fyllt 20 år för att beställa på pactwines.com.</LegalStrong>
      </LegalP>
      <LegalList>
        <li>Du intygar din ålder vid beställning</li>
        <li>Legitimation kontrolleras vid leverans</li>
        <li>
          Vi lämnar inte ut varor till någon som inte kan legitimera sig, eller
          som är märkbart påverkad
        </li>
        <li>Varor får inte lämnas ut till någon annan än beställaren</li>
        <li>
          Om leverans inte kan genomföras på grund av utebliven eller underkänd
          legitimation, se <LegalLink href="#punkt-8">punkt 8</LegalLink>
        </li>
      </LegalList>
      <LegalP>
        Vi säljer inte till någon som vi har anledning att anta ska lämna varan
        vidare till någon under 20 år.
      </LegalP>

      <LegalH2 id="punkt-3">3. Så köper du</LegalH2>
      <LegalP>Du kan välja mellan två leveranssätt i kassan:</LegalP>
      <LegalList>
        <li>
          <LegalStrong>Delad pall.</LegalStrong> Lägre flaskpris och frakt. Din
          order skickas tillsammans med andras när pallen är full. Inget dras
          förrän pallen stänger. Se nedan.
        </li>
        <li>
          <LegalStrong>Direktleverans.</LegalStrong> Flaskpriset är 5 % högre
          och frakten är 149 kr per låda om 6 flaskor. Ditt kort debiteras när
          du köper och vinet levereras normalt inom 5–10 arbetsdagar. Se{" "}
          <LegalLink href="#punkt-3b">punkt 3 b</LegalLink>.
        </li>
      </LegalList>
      <LegalH3>Så fungerar en pall</LegalH3>
      <LegalP>
        PACT samlar flera beställningar till en gemensam transport från
        producenterna i Frankrike till Sverige. Det är därför vinet kan kosta
        vad det gör. Det betyder också att det går till lite annorlunda än i en
        vanlig webbshop.
      </LegalP>
      <LegalP>
        <LegalStrong>Steg 1. Du köper.</LegalStrong> Du väljer viner och
        slutför köpet i kassan.{" "}
        <LegalStrong>Köpet är bindande när du klickar på köpknappen.</LegalStrong>{" "}
        Ditt kort sparas hos vår betalleverantör Stripe, men inget belopp dras
        än. Du får en orderbekräftelse med de här villkoren via e-post.
      </LegalP>
      <LegalP>
        <LegalStrong>Steg 2. Pallen fylls.</LegalStrong> Pallen är först
        virtuell. Du ser hur många flaskor som har beställts och hur många som
        behövs för att pallen ska kunna skickas.
      </LegalP>
      <LegalP>
        <LegalStrong>Steg 3. Pallen stänger och ditt kort debiteras.</LegalStrong>{" "}
        Pallen stänger när den har nått gränsen för att kunna skickas.{" "}
        <LegalStrong>Först då debiteras ditt kort</LegalStrong> med det belopp
        som stod i kassan. Du får ett kvitto via e-post.
      </LegalP>
      <LegalP>
        <LegalStrong>Steg 4. Leverans.</LegalStrong> Din order packas i lådor
        hos producenterna i Frankrike, transporteras till Sverige och levereras
        hem till dig med ID-kontroll (se{" "}
        <LegalLink href="#punkt-7">punkt 7</LegalLink>).
      </LegalP>

      <LegalH3>Avbryta innan pallen stänger</LegalH3>
      <LegalP>
        Fram till att pallen stänger kan du{" "}
        <LegalStrong>avbryta ditt köp utan kostnad</LegalStrong>, via ditt
        konto eller genom att mejla customer@pactwines.com. Inget belopp dras
        då. Efter leveransen har du dessutom ångerrätt enligt{" "}
        <LegalLink href="#punkt-9">punkt 9</LegalLink>.
      </LegalP>

      <LegalH3>Om det tar tid att fylla pallen</LegalH3>
      <LegalP>
        Det finns ingen tidsgräns för när pallen ska vara full.{" "}
        <LegalStrong>
          Din order ligger kvar tills pallen stänger eller tills du själv
          avbryter.
        </LegalStrong>{" "}
        Du behöver inte göra något för att behålla den. Inget belopp dras förrän
        pallen stänger. I ditt konto ser du hur nära gränsen pallen är, och vi
        mejlar dig regelbundet om läget, med en länk där du kan avbryta.
      </LegalP>
      <LegalP>
        När en order avbryts tas ditt sparade kort bort, om du inte väljer att
        spara det för ett kommande köp.
      </LegalP>

      <LegalH3 id="punkt-3b">3 b. Direktleverans</LegalH3>
      <LegalP>
        <LegalStrong>Du köper och betalar.</LegalStrong> Köpet är bindande när
        du klickar på köpknappen. Ditt kort debiteras direkt med totalpriset i
        kassan. Du får en orderbekräftelse med de här villkoren och ett kvitto
        via e-post.
      </LegalP>
      <LegalP>
        <LegalStrong>Leverans.</LegalStrong> Dina lådor packas i Frankrike och
        vi skickar dem med UPS hem till dig. Leveranstiden är normalt{" "}
        <LegalStrong>5–10 arbetsdagar</LegalStrong> från att ordern är bekräftad
        och betald. Har du inte fått din leverans inom 30 dagar får du avbryta
        köpet och får då tillbaka hela beloppet inom 14 dagar.
      </LegalP>
      <LegalP>
        <LegalStrong>Ålderskontroll.</LegalStrong> UPS kontrollerar vid
        överlämningen att mottagaren har fyllt 20 år. Visa giltig legitimation.
        Om ålderskontrollen inte går igenom lämnas vinet inte ut, det skickas
        tillbaka till oss och du får tillbaka pengarna utan avgift.
      </LegalP>
      <LegalP>
        <LegalStrong>Ångerrätt.</LegalStrong> Du har samma ångerrätt som vid
        delad pall, se <LegalLink href="#punkt-9">punkt 9</LegalLink>. Du kan
        ångra köpet redan innan leveransen.
      </LegalP>

      <LegalH3 id="punkt-3c">3 c. Lådor om 6 flaskor</LegalH3>
      <LegalP>
        Vinet packas i lådor om 6 flaskor hos varje producent eller grossist.
        Därför måste antalet flaskor från samma producent eller grossist vara 6,
        12, 18 och så vidare. Du får blanda olika viner från samma producent
        eller grossist i en låda, och du kan köpa från flera i samma order.
        Varukorgen visar om en låda inte är full.
      </LegalP>

      <LegalH3>Om en producent inte kan leverera</LegalH3>
      <LegalP>Det händer att ett vin tar slut efter att du har köpt.</LegalP>
      <LegalList>
        <li>
          Vi erbjuder dig först ett{" "}
          <LegalStrong>likvärdigt ersättningsvin</LegalStrong> från samma
          producent eller grossist. Byte sker bara om du godkänner det.
        </li>
        <li>
          Går det att stryka vinet utan att en låda blir ofullständig får du
          välja att stryka det i stället. Du får då tillbaka pengarna för det
          vinet, eller debiteras inte för det om du ännu inte har debiterats.
        </li>
        <li>
          Om vinet inte kan strykas utan att en låda blir ofullständig och du
          inte godkänner ersättningsvinet,{" "}
          <LegalStrong>avbryts hela ordern</LegalStrong>. Du får då tillbaka
          hela beloppet utan onödigt dröjsmål och senast inom 14 dagar, eller
          debiteras inte alls om du ännu inte har debiterats.
        </li>
      </LegalList>

      <LegalH2 id="punkt-4">4. Priser</LegalH2>
      <LegalList>
        <li>
          Alla priser anges i svenska kronor.{" "}
          <LegalStrong>
            Totalpriset i kassan inkluderar moms och frakt. Inga andra avgifter
            tillkommer.
          </LegalStrong>
        </li>
        <li>
          Det totalpris du ser i kassan är det som debiteras när pallen stänger.
          Vi höjer aldrig priset efter ditt köp.
        </li>
        <li>
          Vid ett uppenbart felaktigt pris har vi rätt att annullera köpet innan
          ditt kort debiteras. Vi meddelar dig då.
        </li>
        <li>
          Vid direktleverans är flaskpriset 5 % högre än vid delad pall,
          avrundat till hela kronor, och frakten är 149 kr per låda om 6
          flaskor. Båda ingår i totalpriset i kassan.
        </li>
      </LegalList>

      <LegalH2 id="punkt-5">5. Betalning</LegalH2>
      <LegalP>
        Du betalar med kort via vår betalleverantör Stripe. När du köper sparas
        ditt kort hos Stripe, och{" "}
        <LegalStrong>
          du godkänner att vi drar det belopp som stod i kassan när pallen
          stänger
        </LegalStrong>
        , utan att du behöver godkänna igen. Inget belopp dras eller reserveras
        innan dess. Vi sparar inga kortuppgifter själva och lagrar aldrig ditt
        fullständiga kortnummer.
      </LegalP>
      <LegalP>
        Vid direktleverans debiteras ditt kort när du köper, inte när en pall
        stänger. Stycket om misslyckad dragning gäller bara delad pall.
      </LegalP>
      <LegalP>
        Din bank kan begära en säkerhetsverifiering (BankID eller motsvarande)
        när du köper eller när kortet debiteras.
      </LegalP>
      <LegalP>
        <LegalStrong>Om dragningen inte går igenom</LegalStrong> när pallen
        stänger, till exempel för att kortet har gått ut eller saknar täckning,
        mejlar vi dig. Du har då <LegalStrong>3 dagar</LegalStrong> på dig att
        betala, till exempel med ett annat kort eller genom att godkänna
        betalningen via länken i mejlet om banken kräver extra verifiering (3D
        Secure). Under tiden gör vi nya försök. Har betalningen inte gått igenom
        inom 3 dagar avslutas köpet och <LegalStrong>inget dras</LegalStrong>.
      </LegalP>
      <LegalP>
        Betalning sker enligt{" "}
        <LegalLink href="https://stripe.com/legal/ssa">
          Stripes villkor för betalningstjänsten
        </LegalLink>. Där regleras vilka betalmedel som kan användas och hur en
        betalning genomförs. Använder du en av Stripes egna konsumenttjänster gäller även{" "}
        <LegalLink href="https://stripe.com/legal/consumer">
          Stripes konsumentvillkor
        </LegalLink>.
      </LegalP>

      <LegalH2 id="punkt-6">6. Beställningsbekräftelse och avtal</LegalH2>
      <LegalList>
        <li>
          <LegalStrong>
            Köpet är bindande när du klickar på köpknappen i kassan.
          </LegalStrong>{" "}
          Du får då en orderbekräftelse via e-post med de här villkoren.
        </li>
        <li>
          När pallen stänger och ditt kort debiteras får du ett kvitto.
        </li>
      </LegalList>

      <LegalH2 id="punkt-7">7. Leverans</LegalH2>
      <LegalList>
        <li>
          Leverans sker med hemleverans och ID-kontroll av vår transportpartner
        </li>
        <li>
          <LegalStrong>Delad pall:</LegalStrong> normalt 2–3 veckor efter att
          pallen har stängt, alltid inom 30 dagar.
        </li>
        <li>
          <LegalStrong>Direktleverans:</LegalStrong> normalt 5–10 arbetsdagar
          från att ordern är bekräftad och betald, alltid inom 30 dagar.
        </li>
        <li>
          Har du inte fått din leverans inom 30 dagar efter att pallen stängde
          eller, vid direktleverans, efter att ordern bekräftades, får du
          avbryta köpet. Du får då tillbaka hela beloppet inom 14 dagar.
        </li>
        <li>
          Angivna leveranstider är uppskattningar. Transport från Frankrike kan
          påverkas av tull, väder och producenternas kapacitet
        </li>
        <li>
          <LegalStrong>
            Risken för varan går över på dig först när du tagit emot den.
          </LegalStrong>{" "}
          Skadas eller försvinner varan under transport är det vårt ansvar
        </li>
      </LegalList>
      <LegalP>
        Om leveransen blir väsentligt försenad har du rätt att häva köpet och få
        pengarna tillbaka. Kontakta oss på customer@pactwines.com.
      </LegalP>

      <LegalH2 id="punkt-8">8. Om leverans inte kan genomföras</LegalH2>
      <LegalP>
        Om du inte är hemma, inte kan legitimera dig eller inte är minst 20 år
        gör vår transportpartner ett nytt leveransförsök. Kan leveransen inte
        genomföras då heller returneras varan.
      </LegalP>
      <LegalP>
        Vid retur betalar du den faktiska returfraktkostnaden, utan påslag. Om
        överlämningen nekas vid ålderskontrollen tar vi inte ut någon avgift.
      </LegalP>
      <LegalP>
        Du får undersöka varan på samma sätt som i en butik, men inte mer än så.
        Har en flaska öppnats, eller förvarats eller hanterats så att vinet kan
        ha tagit skada, till exempel i värme eller direkt solljus, ansvarar du
        för värdeminskningen. Vi får då göra ett avdrag från återbetalningen
        som motsvarar värdeminskningen, upp till flaskans fulla pris. Detta
        följer av 2 kap. 14 § lagen (2005:59) om distansavtal och avtal utanför
        affärslokaler.
      </LegalP>

      <LegalH2 id="punkt-9">9. Ångerrätt</LegalH2>
      <LegalP>
        Du har 14 dagars ångerrätt enligt lagen (2005:59) om distansavtal och
        avtal utanför affärslokaler. Ångerfristen börjar dagen efter att du har
        tagit emot vinet. Köper du flera flaskor som levereras vid olika
        tillfällen börjar fristen när du har tagit emot den sista. Vill du
        ångra köpet mejlar du customer@pactwines.com, eller använder
        standardformuläret för ånger från Konsumentverket, inom fristen. Skicka
        sedan tillbaka varorna senast 14 dagar efter att du meddelat oss. Vi
        betalar tillbaka hela beloppet, inklusive den ursprungliga
        leveranskostnaden för standardleverans, senast 14 dagar efter att vi
        fått ditt meddelande. Vi får vänta med återbetalningen tills vi har fått
        tillbaka varorna. Returfrakt och värdeminskning regleras i{" "}
        <LegalLink href="#punkt-8">§8</LegalLink>. Fram till att pallen stänger
        kan du dessutom avbryta köpet utan kostnad, se{" "}
        <LegalLink href="#punkt-3">punkt 3</LegalLink>.
      </LegalP>

      <LegalH2 id="punkt-10">10. Reklamation</LegalH2>
      <LegalP>
        Är vinet felaktigt, till exempel korkat, skadat vid leverans eller inte
        det du beställt, har du rätt att reklamera enligt konsumentköplagen
        (2022:260). Reklamationsrätten gäller i tre år från leveransen. Meddela
        oss inom skälig tid efter att du upptäckt felet. Meddelar du oss inom
        två månader räknas det alltid som i tid. Mejla customer@pactwines.com
        och bifoga gärna en bild. Vid ett godkänt fel får du en ny flaska, eller
        pengarna tillbaka om det inte går, och vi står för eventuell returfrakt.
        Kan vi inte komma överens kan du vända dig till Allmänna
        reklamationsnämnden (arn.se).
      </LegalP>

      <LegalH2 id="punkt-11">11. Ditt konto</LegalH2>
      <LegalP>
        Du ansvarar för att uppgifterna du lämnar är korrekta och för att hålla
        dina inloggningsuppgifter skyddade. Vi kan stänga av ett konto vid
        missbruk, vid försök att kringgå åldersgränsen eller vid vidareförsäljning
        av varorna.
      </LegalP>
      <LegalP>
        Vidareförsäljning av alkohol köpt hos oss är inte tillåten och kan
        utgöra brott enligt alkohollagen.
      </LegalP>

      <LegalH2 id="punkt-12">12. Personuppgifter</LegalH2>
      <LegalP>
        Hur vi behandlar dina personuppgifter beskrivs i vår{" "}
        <LegalLink href="/integritetspolicy">integritetspolicy</LegalLink>.
      </LegalP>

      <LegalH2 id="punkt-13">13. Tvist och tillämplig lag</LegalH2>
      <LegalP>
        För detta avtal gäller <LegalStrong>svensk rätt</LegalStrong>. Som
        konsument med hemvist i Sverige har du alltid det skydd som följer av
        tvingande svensk konsumentskyddslagstiftning, oavsett vad som anges här.
      </LegalP>
      <LegalP>Om vi inte kommer överens kan du vända dig till:</LegalP>
      <LegalList>
        <li>
          <LegalStrong>Allmänna reklamationsnämnden (ARN)</LegalStrong>, arn.se,
          Box 174, 101 23 Stockholm
        </li>
        <li>
          <LegalStrong>Konsument Europa</LegalStrong>, som ger kostnadsfri
          vägledning vid gränsöverskridande handel inom EU, och som är rätt väg
          om ARN inte prövar ärendet
        </li>
      </LegalList>
      <LegalP>
        Vi medverkar i tvistlösning inför ARN och följer nämndens
        rekommendationer.
      </LegalP>

      <LegalH2 id="punkt-14">14. Ändringar av villkoren</LegalH2>
      <LegalP>
        De villkor som gällde när du köpte är de som gäller för det köpet.
        Ändringar påverkar inte köp som redan har gjorts.
      </LegalP>
    </LegalProse>
  );
}
