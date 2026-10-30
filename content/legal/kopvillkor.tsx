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

export default function KopvillkorContent() {
  return (
    <LegalProse>
      <LegalH2>1. Om oss</LegalH2>
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
            <LegalTd>Tartu mnt 67/1-13b, 10115, stadscentrum, Tallinn, Harju län, Estland</LegalTd>
          </tr>
          <tr>
            <LegalTh>E-post</LegalTh>
            <LegalTd>[FYLL I]</LegalTd>
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

      <LegalH2>2. Åldersgräns</LegalH2>
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
          legitimation, se punkt 8
        </li>
      </LegalList>
      <LegalP>
        Vi säljer inte till någon som vi har anledning att anta ska lämna varan
        vidare till någon under 20 år.
      </LegalP>

      <LegalH2>3. Så fungerar en pall</LegalH2>
      <LegalP>
        PACT samlar flera beställningar till en gemensam transport från
        producenterna i Frankrike till Sverige. Det är därför vinet kan kosta
        vad det gör. Det innebär också att köpet går till annorlunda än i en
        vanlig webbshop, och det är viktigt att du förstår hur.
      </LegalP>
      <LegalP>
        <LegalStrong>Steg 1. Du reserverar.</LegalStrong> Du väljer viner och
        lägger en reservation. Du anger dina kortuppgifter, men{" "}
        <LegalStrong>inget belopp dras och kortet reserveras inte</LegalStrong>.
        Du får en bekräftelse på din reservation via e-post.
      </LegalP>
      <LegalP>
        <LegalStrong>Steg 2. Pallen fylls.</LegalStrong> Pallen är först
        virtuell: du ser hur många flaskor som beställts jämfört med den tröskel
        som krävs. Vi samlar reservationer tills tröskeln nås. Först när pallen
        närmar sig tröskeln väljs producent och upphämtningsplats, och pallen
        blir fysisk.
      </LegalP>
      <LegalP>
        <LegalStrong>Steg 3. Pallen stänger och betalning sker.</LegalStrong>{" "}
        När pallen är full stänger vi den och{" "}
        <LegalStrong>då först debiteras ditt kort</LegalStrong> med det belopp
        som framgick av din reservation. Du får ett kvitto via e-post. Först i
        detta ögonblick uppstår ett bindande köpavtal mellan dig och EURPACT
        OÜ.
      </LegalP>
      <LegalP>
        <LegalStrong>Steg 4. Leverans.</LegalStrong> Din order packas i lådor
        direkt hos producenterna i Frankrike, transporteras till Sverige och
        levereras hem till dig med ID-kontroll.
      </LegalP>

      <LegalH3>Din reservation är inte ett bindande köp</LegalH3>
      <LegalP>
        Fram till att pallen stänger och betalning genomförs kan du{" "}
        <LegalStrong>när som helst avboka din reservation utan kostnad</LegalStrong>
        , via ditt konto eller genom att mejla oss.
      </LegalP>

      <LegalH3>Vad händer om pallen inte fylls</LegalH3>
      <LegalP>
        Din reservation är giltig i <LegalStrong>30 dagar</LegalStrong> från att
        du lade den.
      </LegalP>
      <LegalP>
        Om pallen fortfarande inte nått nödvändig volym (tröskeln) efter 30
        dagar skickar vi ett e-postmeddelande där du ombeds bekräfta om pallen
        ska få ytterligare 30 dagar på sig att nå tröskeln. Du har{" "}
        <LegalStrong>7 dagar</LegalStrong> från det e-postmeddelandet att
        bekräfta via länken i mejlet.
      </LegalP>
      <LegalList>
        <li>
          Bekräftar du inom 7 dagar fortsätter din reservation att gälla i
          ytterligare 30 dagar
        </li>
        <li>
          Du kan förlänga på samma sätt{" "}
          <LegalStrong>hur många gånger du vill</LegalStrong>, 30 dagar i
          taget, varje gång genom att bekräfta via länken i e-postmeddelandet
          inom 7 dagar. Det finns ingen bortre tidsgräns
        </li>
        <li>
          Bekräftar du inte inom 7 dagar upphör din reservation automatiskt och{" "}
          <LegalStrong>inget belopp debiteras</LegalStrong>
        </li>
      </LegalList>
      <LegalP>
        När en reservation upphör utan att pallen fyllts debiteras{" "}
        <LegalStrong>inget belopp</LegalStrong>. Debitering sker först när
        pallen är fylld och stängs. Din sparade betalmetod tas bort eller kan
        användas för en kommande pall enligt ditt val. Vi informerar dig via
        e-post.
      </LegalP>
      <LegalP>Vi lämnar aldrig en reservation öppen på obestämd tid.</LegalP>

      <LegalH3>Om en producent inte kan leverera</LegalH3>
      <LegalP>
        Ibland kan en producent inte leverera ett vin du reserverat, till
        exempel om lagret tar slut efter att pallen stängt. Då gäller följande:
      </LegalP>
      <LegalList>
        <li>
          Vi erbjuder dig först ett{" "}
          <LegalStrong>likvärdigt ersättningsvin</LegalStrong>
        </li>
        <li>
          Byte sker{" "}
          <LegalStrong>bara om du godkänner</LegalStrong> ersättningsvinet
        </li>
        <li>
          Avböjer du, eller godkänner du inte ersättningen, får du pengarna
          tillbaka för de viner som inte levereras —{" "}
          <LegalStrong>
            utan onödigt dröjsmål och senast inom 14 dagar
          </LegalStrong>{" "}
          om du redan har debiterats. Har du inte debiterats ännu debiteras du
          inte för de vinerna
        </li>
      </LegalList>

      <LegalH2>4. Priser</LegalH2>
      <LegalList>
        <li>
          Alla priser anges i svenska kronor och{" "}
          <LegalStrong>inklusive svensk moms och svensk alkoholskatt</LegalStrong>
        </li>
        <li>
          Priset du ser vid reservationen är det pris som debiteras när pallen
          stänger. Vi ändrar aldrig priset på en befintlig reservation uppåt
        </li>
        <li>Fraktkostnad anges separat innan du bekräftar reservationen</li>
        <li>
          Vi reserverar oss för uppenbara felaktiga prisangivelser. Om ett pris
          är uppenbart fel har vi rätt att annullera reservationen och informera
          dig, innan betalning sker
        </li>
      </LegalList>

      <LegalH2>5. Betalning</LegalH2>
      <LegalP>Betalningar hanteras av Stripe. Vi lagrar aldrig ditt fullständiga kortnummer.</LegalP>
      <LegalP>
        <LegalStrong>Så sparas ditt kort.</LegalStrong> När du reserverar sparas
        din betalmetod hos Stripe med ditt medgivande, så att vi kan genomföra
        betalningen när pallen stänger. Detta är inte samma sak som att pengar
        dras eller reserveras. Beloppet dras vid ett enda tillfälle, när pallen
        stänger.
      </LegalP>
      <LegalP>
        Din bank kan komma att kräva en säkerhetsverifiering (BankID eller
        motsvarande) antingen vid reservationen eller vid debiteringen.
      </LegalP>
      <LegalP>
        <LegalStrong>Om betalningen inte kan genomföras</LegalStrong> när pallen
        stänger, till exempel för att kortet gått ut eller saknar täckning,
        gäller Stripes regler för betalningen och villkoren för det betalmedel
        du använder. Sker ingen betalning återgår varorna till försäljning.
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

      <LegalH2>6. Beställningsbekräftelse och avtal</LegalH2>
      <LegalList>
        <li>
          Reservationsbekräftelsen är en bekräftelse på att vi tagit emot din
          reservation, inte ett bindande köpavtal
        </li>
        <li>
          Bindande avtal uppstår när pallen stänger och betalningen genomförs.
          Du får då en orderbekräftelse med kvitto
        </li>
      </LegalList>

      <LegalH2>7. Leverans</LegalH2>
      <LegalList>
        <li>Leverans sker med hemleverans och ID-kontroll av Budbee</li>
        <li>Leverans sker till adresser i [FYLL I LEVERANSOMRÅDE]</li>
        <li>
          Beräknad leveranstid efter att pallen stängt: [FYLL I], normalt [FYLL
          I] veckor
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
        pengarna tillbaka. Kontakta oss på [FYLL I E-POST].
      </LegalP>

      <LegalH2>8. Om leverans inte kan genomföras</LegalH2>
      <LegalP>
        Om du inte är hemma, inte kan legitimera dig eller inte är minst 20 år
        gör Budbee ett nytt leveransförsök. Kan leveransen inte genomföras då
        heller returneras varan.
      </LegalP>
      <LegalP>
        Hur ett uteblivet leveransförsök hanteras beskrivs av{" "}
        <LegalLink href="https://budbee.com/se/kundservice/leveranser/">
          Budbee
        </LegalLink>.
      </LegalP>

      <LegalH2>9. Ångerrätt</LegalH2>
      <LegalP>
        Vin är en levande produkt. Ångerrätt gäller därför inte för köp på
        pactwines.com.
      </LegalP>

      <LegalH2>10. Reklamation</LegalH2>
      <LegalP>Reklamation kan inte göras.</LegalP>

      <LegalH2>11. Ditt konto</LegalH2>
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

      <LegalH2>12. Personuppgifter</LegalH2>
      <LegalP>
        Hur vi behandlar dina personuppgifter beskrivs i vår{" "}
        <LegalLink href="/integritetspolicy">integritetspolicy</LegalLink>.
      </LegalP>

      <LegalH2>13. Tvist och tillämplig lag</LegalH2>
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
        <li>
          <LegalStrong>EU:s onlineplattform för tvistlösning</LegalStrong>,
          ec.europa.eu/odr
        </li>
      </LegalList>
      <LegalP>
        Vi medverkar i tvistlösning inför ARN och följer nämndens
        rekommendationer.
      </LegalP>

      <LegalH2>14. Ändringar av villkoren</LegalH2>
      <LegalP>
        De villkor som gällde när du lade din reservation är de som gäller för
        det köpet. Ändringar av dessa villkor påverkar inte redan lagda
        reservationer.
      </LegalP>
    </LegalProse>
  );
}
