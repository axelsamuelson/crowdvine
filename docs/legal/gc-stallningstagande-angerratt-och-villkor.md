# GC-ställningstagande: ångerrätt, avtalsbundenhet och villkor

Sofia Bergström, General Counsel, 25 augusti 2026. Svar på de elva frågorna i uppdragsbrevet.

---

## Om det här dokumentets status

Axel har valt att inte anlita extern alkoholjurist för de här frågorna, utan att låta mig avgöra dem. Jag gör det, men jag graderar varje svar så att ni ser vad ni faktiskt lutar er mot:

| Grad | Betydelse |
|---|---|
| **Fastställt** | Följer direkt av lagtext. Jag skulle bli förvånad om en advokat sa något annat |
| **Bedömning** | Resonemang från lagtext och praxis. Kan ifrågasättas, risken är prissatt nedan |
| **Kvarstår** | Jag kan inte stänga frågan. Antingen affärsbeslut eller extern bedömning |

Nio av elva frågor är fastställda eller bedömda. Två kvarstår. Jag bär inget ansvar, och det gör inte en skill heller. Det är den enda meningen om detta jag tänker skriva.

---

## Fråga 1. Ångerrätten

### Svar: **Full ångerrätt om 14 dagar gäller, räknat från det att kunden tagit emot varan. Fastställt.**

Jag har gått igenom samtliga undantag i 2 kap. 11 § distansavtalslagen. Fyra av dem är relevanta att pröva, och inget av dem träffar er.

**Punkt 7, alkoholundantaget.** Detta är det enda undantag som uttryckligen nämner alkohol, och det är det ni skulle ha velat luta er mot. Lydelsen är:

> "Avser alkoholhaltig dryck till ett bestämt pris, när leverans inte kan ske inom 30 dagar och värdet på drycken vid leveransen beror på svängningar på marknaden"

Tre villkor, kumulativa. Ni klarar de två första. **Ni faller på det tredje.** Vinets värde vid leveransen beror inte på svängningar på marknaden. Ni har till och med skrivit in i utkastet att priset aldrig ändras. Undantaget är skrivet för en primeur-handel, alltså vin som köps som termin och vars marknadsvärde rör sig mellan avtal och leverans. Er pallmodell är en logistiklösning, inte en terminsmarknad. Att leveransen dröjer räcker inte.

**Punkt 3, varor tillverkade enligt konsumentens anvisningar eller med tydlig personlig prägel.** Träffar inte. Vinet tillverkas inte efter kundens anvisningar. Att en order plockas och etiketteras individuellt hos producenten är packning, inte tillverkning. Min tidigare preliminära bedömning att detta undantag var svagt stod sig, och jag skärper den nu till att det inte är tillämpligt alls.

**Punkt 5, bruten försegling av hälso- eller hygienskäl.** Träffar öppnade flaskor. En oöppnad, obruten flaska kan lämnas tillbaka. Detta är alltså inget generellt undantag för vin, utan bara för flaskor kunden har öppnat.

**Punkt 4, varor som snabbt kan försämras eller bli för gamla.** Träffar inte vin. Om något är motsatsen sann.

### Konsekvenser ni måste ta in

**Ångerfristen börjar löpa när kunden får varan i sin besittning**, inte vid reservationen och inte vid debiteringen. Frågan om när avtalet ingås spelar alltså mindre roll än ni trodde för just detta.

**Om ni inte informerar om ångerrätten förlängs fristen med upp till ett år.** Det är den verkliga exponeringen. En kund som fick sin låda utan att ha sett några villkor kan ångra köpet i upp till ett år och fjorton dagar. Med er modell, där betalning sker långt före leverans, betyder det att pengar kan behöva betalas tillbaka för en pall som redan är transporterad och konsumerad.

**Returkostnaden.** Konsumenten står för returkostnaden endast om ni har informerat om det innan avtalet. Har ni inte gjort det står ni för den. Ange kostnaden i kronor i villkoren, inte "faktisk kostnad".

### Vad som ska stå i villkoren

Full ångerrätt, 14 dagar från mottagandet, för flaskor med obruten försegling. Ingen ångerrätt för öppnade flaskor. Kunden står för returfrakten, angiven i kronor. Använd Konsumentverkets standardformulär.

**Returhanteringen kvarstår som praktisk fråga.** Se fråga 12 sist i dokumentet.

---

## Fråga 2. Reservationens rättsliga karaktär

### Svar: **Ni bestämmer det själva, men det får inte den effekt ni tror. Fastställt.**

Ni kan konstruera reservationen som ett återkalleligt anbud som ni antar genom att debitera. Det är hederligt och det är vad utkastet säger. Men 2 kap. 9 § distansavtalslagen sätter en gräns:

> "Vid distansavtal som ingås på en webbplats är konsumenten bunden av en beställning som medför en betalningsförpliktelse endast om förpliktelsen har tydliggjorts före beställningen och konsumenten uttryckligen har påtagit sig förpliktelsen."

**Det avgörande i er modell är att kunden aldrig trycker på någon andra knapp.** Debiteringen sker automatiskt när pallen stänger, utan någon handling från kunden. Det finns alltså bara ett enda tillfälle där kunden kan påta sig betalningsförpliktelsen, och det är vid reservationen.

Slutsatsen: **reservationsknappen är betalningsögonblicket i lagens mening**, oavsett vad ni kallar den. Den måste därför tydliggöra betalningsförpliktelsen före klicket.

### Konkret krav på knappen

Rubricera den inte enbart "Reservera". Den ska bära betalningsförpliktelsen, förslagsvis "Reservera och godkänn betalning när pallen stänger", med beloppet synligt intill. En knapp som bara säger "Reservera" i kombination med en automatisk debitering veckor senare är den enskilt största formella bristen i flödet som det är ritat nu.

Detta är en ändring i checkout-koden, inte i villkoren. Erik och Johan behöver den.

---

## Fråga 3. Transparens kring uppskjuten debitering

### Svar: **Villkoren räcker inte. Det krävs tre saker. Fastställt.**

1. Betalningsförpliktelsen tydliggjord på och intill knappen, enligt fråga 2
2. Raden "Inget dras nu. Du betalar först när pallen stänger" i klartext i flödet, vilket redan ligger i frontend-prompten
3. **Bekräftelse i varaktig form.** Kunden ska efter avtalet få villkoren i en form som går att spara och läsa senare. En länk till en webbsida som ni kan ändra räcker inte

Punkt 3 är den ni saknar. Lös den genom att bifoga villkoren som de löd vid godkännandet i reservationsbekräftelsen per mail. Det löser samtidigt fråga 4.

---

## Fråga 4. Räcker version och tidsstämpel som bevisning?

### Svar: **Nödvändigt men inte tillräckligt. Bedömning.**

`terms_version` och `terms_accepted_at` visar *att* något godkändes och *när*. De visar inte *vad*. I en tvist är det lydelsen som är föremål för prövningen.

Ni behöver kunna återskapa exakt text för en given version. Två saker gör det:

- Villkoren ligger som versionerade filer i repot, vilket de gör. Tagga varje version i git så att den är oföränderlig
- Bifoga villkorstexten i bekräftelsemailet, enligt fråga 3. Då finns beviset hos kunden också, vilket är starkare än att bara ha det hos er

Med de två tilläggen är dokumentationen god. Utan dem har ni en tidsstämpel som pekar på ingenting.

---

## Fråga 5. Reservationer utan tidsgräns

### Svar: **Sätt 90 dagar. Bedömning.**

Att hålla en kunds sparade betalmetod knuten till en öppen förpliktelse på obestämd tid är svårt att förena med 2 kap. 9 §. Ju längre tid som gått, desto svagare är påståendet att kunden uttryckligen påtagit sig just den betalningen.

Det finns också ett praktiskt skäl som väger lika tungt: ett Stripe-mandat som används för första gången efter mycket lång tid är en tvistmagnet. Kunden minns inte, banken ifrågasätter, och ni förlorar en chargeback ni hade haft rätt i.

90 dagar är min rekommendation. Efter det upphör reservationen och kunden får aktivt förnya. Är pallen på 30 av 720 flaskor efter tre månader är det ändå inte reservationen som är problemet.

---

## Fråga 6. De sex befintliga reservationerna

### Svar: **Debitera dem inte. Inhämta nytt godkännande. Fastställt.**

Samtliga sex saknar uppgift om godkända villkor och om ålderskontroll. Enligt 2 kap. 9 § är kunden bunden av en betalningsförpliktelse endast om den tydliggjorts och uttryckligen påtagits. Det har inte skett. **En debitering av dessa reservationer är en debitering utan bindande betalningsförpliktelse.**

Rutinen:

1. Ingen av de sex debiteras förrän nytt godkännande finns
2. Mail till de fem aktiva kunderna med villkoren bifogade, en länk som låter dem godkänna och uppge födelsedatum, och beskedet att reservationen annars faller
3. Ett bekräftat klick räcker som godkännande. Skriftlig underskrift krävs inte
4. Den som inte svarar inom 30 dagar får sin reservation avslutad utan debitering
5. Den avbokade reservationen berörs inte

Detta är inte brådskande i tid, pallen ligger på fyra procent. Det är brådskande i ordning: det måste vara gjort innan pallen stänger, och pallar stänger snabbare än man tror när de väl rör sig.

**Anmärkning till Johan:** en av de sex ligger i `pending_payment` medan pallen står i `consolidating`. Enligt pall-logiken sätts `pending_payment` först vid hundra procents fyllnad. Utred den raden. Det är den enda av de sex som skulle plockas upp av en automatisk debitering.

---

## Fråga 7. ARN eller Konsument Europa

### Svar: **Sannolikt ARN. Ange båda. Bedömning.**

ARN prövar tvister där "företaget har tillräcklig anknytning till Sverige eller riktar sig till den svenska marknaden". EURPACT OÜ är etablerat i Estland men riktar sig otvetydigt mot den svenska marknaden: svensk webbplats, svenska konsumenter, svensk alkoholskatt, svensk moms, leverans i Sverige. Jag bedömer att ARN är behörig.

Men ARN:s egen sida hänvisar konsumenter med tvister mot bolag i andra EU-länder till Konsument Europa. Det är en reell möjlighet att en anmälan avvisas.

**Formulera villkoren så att båda vägarna anges**, ARN först och Konsument Europa som alternativ vid gränsöverskridande tvist. Skriv aldrig att ni följer ARN:s beslut på ett sätt som förutsätter att ARN tar upp ärendet.

**Tillämplig lag:** ange svensk rätt. Ni kan inte avtala bort svensk tvingande konsumentskyddslagstiftning för konsumenter med hemvist i Sverige enligt Rom I, så att ange något annat skapar bara en villkorspunkt som är ogiltig och som ser illa ut.

---

## Fråga 8. Åldersverifieringen

### Svar: **Tillräckligt som byggt. Bedömning.**

Den rättsligt operativa kontrollen sker vid utlämnandet, där mottagaren ska legitimera sig och varan inte lämnas ut vid tveksamhet. Det är den kontrollen som bär.

Självdeklarerat födelsedatum vid beställning är ett komplement som gör att uppenbart underåriga stoppas tidigt och som visar att ni tagit aktiva steg. Att den kontrollen sker på servern och avvisar innan betalning påbörjas är rätt byggt.

Två krav på fraktavtalet, som är där risken faktiskt sitter:

- Avtalet med Instabee ska uttryckligen ålägga dem att kontrollera legitimation och 20-årsgräns, och att inte lämna ut till märkbart påverkad mottagare
- Utfallet ska rapporteras tillbaka till er och gå att visa upp

Bygg inte starkare verifiering vid beställning. BankID vid reservationen skulle döda konverteringen och tillför lite, eftersom kontrollen ändå görs vid dörren.

---

## Fråga 9. Marknadsföring till befintliga kunder

### Svar: **Nej, inte utan att kunden själv bett om det. Fastställt, och det här är svaret ni inte ville ha.**

Undantaget för befintlig kundrelation i marknadsföringslagen hjälper er inte. Alkohollagen är strängare och går före.

Konsumentverkets allmänna råd om marknadsföring av alkoholdryck till konsumenter utgår från att **direktreklam för alkohol är oförenlig med kravet på särskild måttfullhet**. Undantaget är när konsumenten uttryckligen har begärt att få informationen.

Praktiskt betyder det:

- **Nyhetsbrev kräver aktiv, uttrycklig anmälan.** Inte en förkryssad ruta, inte "du får våra utskick eftersom du handlat av oss"
- **Transaktionsmail är inte marknadsföring** och berörs inte. Orderbekräftelser, pallstatus, leveransbesked går bra
- **Ett mail som säger "pallen stänger snart, komplettera din order" ligger i gränslandet.** Det är delvis information om en pågående affär, delvis en uppmaning att köpa mer. Håll det sakligt och utan säljande språk
- Innehållet ska hålla sig till relevanta fakta om varan, sakligt presenterade

Detta får konsekvenser för hur Emma planerar B2C-förvärv. Den kanalen är smalare än en normal e-handel och det bör hon veta nu snarare än efter att listan är byggd.

---

## Fråga 10. Språk och form

### Svar: **Svenska, och i varaktig form. Fastställt.**

Villkoren ska vara på svenska för svenska konsumenter. Att sidan finns tillgänglig på webbplatsen räcker för informationsplikten före avtalet, men inte för bekräftelsen efter. Se fråga 3.

De engelska routes ni byggt kan ligga kvar, men den svenska texten är den som gäller mot svenska konsumenter. Skriv in det i villkoren: vid tolkningsskillnad gäller den svenska versionen.

---

## Fråga 11. Registreringen hos Skatteverket

### Svar: **Ange den när den är beviljad. Bedömning.**

När registreringen som distansförsäljare är beviljad, ange den i köpvillkorens inledande faktaruta tillsammans med bolagsnamn och registreringsnummer. Det är både ett trovärdighetsargument mot kunden och något en tillsynsmyndighet kommer leta efter först.

**Innan registreringen är beviljad får ingen konsumentorder debiteras.** Det står oförändrat och är den enda hårda spärren i det här dokumentet som inte ligger i er kontroll.

---

## Fråga 12. Det som kvarstår

Två saker kan jag inte stänga.

**1. Returhanteringen i praktiken.** Ångerrätten är fastställd. Vad som praktiskt ska hända med en flaska som en kund i Sverige ångrar, när säljaren är estnisk och varan kom från Frankrike, är inte en juridisk fråga utan en operativ. Vem tar emot returen, var lagras den, får den säljas vidare, och vad kostar det jämfört med att bara betala tillbaka utan att kräva returen? **Min rekommendation är att ni räknar på att avstå returen helt** under ett visst belopp och bara krediterar. Det är vanligt, det är billigare, och det tar bort hela problemet. Alex och Johan äger den kalkylen, inte jag.

**2. Om ni någon gång vill utmana ångerrättssvaret.** Om ångerrätten visar sig kosta er verkligt mycket pengar, och ni vill pröva om pallmodellen ändå kan konstrueras så att undantag 7 blir tillämpligt, då behöver ni en advokat. Det är en fråga om att bygga om affären för att passa ett undantag, och sådant ska ingen skill besluta. Idag är svaret nej och det räcker.

---

## Vad som ändras i dokumenten

| Dokument | Ändring |
|---|---|
| Köpvillkor p. 9 | Ångerrätten skrivs färdig enligt fråga 1. Varningsrutan tas bort |
| Köpvillkor p. 13 | ARN och Konsument Europa, svensk rätt, enligt fråga 7 |
| Köpvillkor p. 3 | Bortre tidsgräns 90 dagar enligt fråga 5 |
| Integritetspolicy p. 3 | Nyhetsbrev endast på uttrycklig begäran, enligt fråga 9 |
| Checkout, kod | Knappen ska bära betalningsförpliktelsen, enligt fråga 2 |
| Bekräftelsemail, kod | Villkoren bifogas som de löd vid godkännandet, enligt fråga 3 och 4 |
| Rutin | Nytt godkännande från de fem aktiva reservationerna, enligt fråga 6 |

---

## Källor

- [Lag (2005:59) om distansavtal och avtal utanför affärslokaler, lagen.nu](https://lagen.nu/2005:59)
- [Konsumentverkets allmänna råd om marknadsföring av alkoholdryck till konsumenter (KOVFS 2016:1)](https://lagen.nu/kovfs/2016:1)
- [Allmänna reklamationsnämnden, tvist med företag i annat EU-land](https://www.arn.se/om-arn/tvist-med-foretag-i-annat-eu-land/)
- [Konsumentverket, marknadsföring av alkohol på internet](https://konsumentverket-se-prod.azurewebsites.net/for-foretag/regler-per-omradebransch/alkohol/marknadsforing-av-alkohol-pa-internet/)
