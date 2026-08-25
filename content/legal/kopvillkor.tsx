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
            <LegalTd>[FYLL I REGISTRERAD ADRESS I ESTLAND]</LegalTd>
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
        <LegalStrong>Steg 2. Pallen fylls.</LegalStrong> Vi samlar
        reservationer tills pallen når den volym som krävs för att transporten
        ska gå. Du kan följa pallens status på [FYLL I LÄNK, förslag:
        pactwines.com/pallet].
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
        <LegalStrong>Steg 4. Leverans.</LegalStrong> Producenten packar och
        etiketterar din order i Frankrike. Pallen transporteras till Sverige och
        din order levereras hem till dig med ID-kontroll.
      </LegalP>

      <LegalH3>Din reservation är inte ett bindande köp</LegalH3>
      <LegalP>
        Fram till att pallen stänger och betalning genomförs kan du{" "}
        <LegalStrong>när som helst avboka din reservation utan kostnad</LegalStrong>
        , via ditt konto eller genom att mejla oss.
      </LegalP>

      <LegalH3>Vad händer om pallen inte fylls</LegalH3>
      <LegalP>
        Om pallen inte når nödvändig volym inom <LegalStrong>90 dagar</LegalStrong>{" "}
        från din reservation:
      </LegalP>
      <LegalList>
        <li>Din reservation upphör automatiskt</li>
        <li>
          <LegalStrong>Inget belopp debiteras</LegalStrong>
        </li>
        <li>
          Din sparade betalmetod tas bort eller kan användas för en kommande
          pall enligt ditt val
        </li>
        <li>Vi informerar dig via e-post</li>
      </LegalList>
      <LegalP>Vi lämnar aldrig en reservation öppen på obestämd tid.</LegalP>

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
        <LegalStrong>Om betalningen misslyckas</LegalStrong> när pallen stänger,
        till exempel för att kortet gått ut eller saknar täckning, kontaktar vi
        dig och du får [FYLL I ANTAL] dagar att ordna betalning. Sker ingen
        betalning inom den tiden återgår varorna till försäljning.
      </LegalP>
      <LegalP>Accepterade betalmedel: [FYLL I].</LegalP>

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
        <li>Leverans sker med hemleverans och ID-kontroll av [FYLL I, Instabee]</li>
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
        görs [FYLL I ANTAL] nya leveransförsök. Därefter returneras varan.
      </LegalP>

      <LegalH2>9. Ångerrätt</LegalH2>
      <LegalP>
        Du har rätt att ångra ditt köp inom <LegalStrong>14 dagar</LegalStrong>{" "}
        från den dag du tog emot varan.
      </LegalP>
      <LegalP>
        <LegalStrong>Så gör du.</LegalStrong> Meddela oss på [FYLL I E-POST]
        innan ångerfristen gått ut. Du kan också använda Konsumentverkets
        standardformulär för utövande av ångerrätt. Vi bekräftar att vi
        mottagit din anmälan.
      </LegalP>
      <LegalP>
        <LegalStrong>Vad som kan ångras.</LegalStrong> Ångerrätten gäller
        flaskor med <LegalStrong>obruten försegling</LegalStrong>. Har du öppnat
        en flaska kan den av hygienskäl inte lämnas tillbaka, och den flaskan
        omfattas därför inte av ångerrätten. Övriga flaskor i samma order
        påverkas inte.
      </LegalP>
      <LegalP>
        <LegalStrong>Återbetalning.</LegalStrong> Vi betalar tillbaka vad du
        betalat för de returnerade flaskorna, inklusive den standardfraktkostnad
        du betalade, senast 14 dagar efter att vi tagit emot din ångeranmälan.
        Vi kan vänta med återbetalningen tills vi fått tillbaka varan eller du
        visat att den skickats.
      </LegalP>
      <LegalP>
        <LegalStrong>Returkostnad.</LegalStrong> Du står för kostnaden att
        skicka tillbaka varan. Den uppgår till [FYLL I BELOPP] kronor.
      </LegalP>
      <LegalP>
        <LegalStrong>Varans skick.</LegalStrong> Du ansvarar för varans
        värdeminskning om du hanterat den mer än vad som behövs för att
        fastställa dess egenskaper.
      </LegalP>

      <LegalH2>10. Reklamation</LegalH2>
      <LegalP>
        Du har rätt att reklamera fel på varan i upp till 3 år från leverans
        enligt konsumentköplagen. Fel som visar sig inom två år antas ha funnits
        vid leveransen om inte annat kan visas.
      </LegalP>
      <LegalP>
        Reklamera till [FYLL I E-POST] med ordernummer och gärna bild. Vid
        godkänd reklamation får du ny vara eller pengarna tillbaka, och vi står
        för returkostnaden.
      </LegalP>
      <LegalP>Detta gäller även korkade eller på annat sätt felaktiga viner.</LegalP>

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
