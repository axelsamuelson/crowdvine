# Köpvillkor – tillägg för direktleverans (UPS) och lådregeln

Status: UTKAST från Juliette 2026-11-11. Bygger på köpvillkoren som Axel godkände 2026-11-10 22:24 (kopvillkor-GODKAND-2026-11-10-2224.md). Får inte publiceras förrän Axel har godkänt och Inès har granskat.

Varför: direktleverans är byggd och mergad (PR223, kortbetalning direkt vid köp, 149 kr frakt per låda, 5–10 arbetsdagar). Köpvillkoren beskriver i dag bara delad pall: att kortet debiteras när pallen stänger och att leverans sker 2–3 veckor efter stängning. Säljs direktleverans under de villkoren stämmer de inte med det kunden faktiskt köper.

Underlag (Axels beslut 2026-11-11 01:00 och 01:24, via Hugo): UPS Standard, leveranstid 5–10 arbetsdagar, flaskpris 5 % över pallpriset avrundat till hela kronor, frakt 149 kr inkl. moms per låda om 6, UPS kontrollerar ålder 20 år vid överlämning. Varje producent eller grossist packar sina egna lådor, så antalet flaskor per källa måste vara 6, 12, 18 osv. Viner får blandas inom samma källa. Om ett vin tar slut och det bryter en hel låda måste kunden godta ett ersättningsvin, annars avbryts hela ordern och pengarna betalas tillbaka.

---

## Punkt 3. Två sätt att köpa (nytt inledande stycke, före "Så fungerar en pall")

Du kan välja mellan två leveranssätt i kassan:

- **Delad pall.** Lägre flaskpris och frakt. Din order skickas tillsammans med andras när pallen är full. Inget dras förrän pallen stänger. Se nedan.
- **Direktleverans.** Flaskpriset är 5 % högre och frakten är 149 kr per låda om 6 flaskor. Ditt kort debiteras när du köper och vinet levereras normalt inom 5–10 arbetsdagar. Se punkt 3 b.

## Punkt 3 b. Direktleverans (ny underpunkt)

**Du köper och betalar.** Köpet är bindande när du klickar på köpknappen. Ditt kort debiteras direkt med totalpriset i kassan. Du får en orderbekräftelse med de här villkoren och ett kvitto via e-post.

**Leverans.** Dina lådor packas i Frankrike och vi skickar dem med UPS hem till dig. Leveranstiden är normalt **5–10 arbetsdagar** från att ordern är bekräftad och betald. Har du inte fått din leverans inom 30 dagar får du avbryta köpet och får då tillbaka hela beloppet inom 14 dagar.

**Ålderskontroll.** UPS kontrollerar vid överlämningen att mottagaren har fyllt 20 år. Visa giltig legitimation. Om ålderskontrollen inte går igenom lämnas vinet inte ut, det skickas tillbaka till oss och du får tillbaka pengarna utan avgift.

**Ångerrätt.** Du har samma ångerrätt som vid delad pall, se punkt 9. Du kan ångra köpet redan innan leveransen.

## Punkt 3 c. Lådor om 6 flaskor (ny underpunkt, gäller båda leveranssätten)

Vinet packas i lådor om 6 flaskor hos varje producent eller grossist. Därför måste antalet flaskor från samma producent eller grossist vara 6, 12, 18 och så vidare. Du får blanda olika viner från samma producent eller grossist i en låda, och du kan köpa från flera i samma order. Varukorgen visar om en låda inte är full.

## Punkt 3, "Om en producent inte kan leverera" (ersätter den oförändrade texten)

Det händer att ett vin tar slut efter att du har köpt.

- Vi erbjuder dig först ett **likvärdigt ersättningsvin** från samma producent eller grossist. Byte sker bara om du godkänner det.
- Går det att stryka vinet utan att en låda blir ofullständig får du välja att stryka det i stället. Du får då tillbaka pengarna för det vinet, eller debiteras inte för det om du ännu inte har debiterats.
- Om vinet inte kan strykas utan att en låda blir ofullständig och du inte godkänner ersättningsvinet, **avbryts hela ordern**. Du får då tillbaka hela beloppet utan onödigt dröjsmål och senast inom 14 dagar, eller debiteras inte alls om du ännu inte har debiterats.

## Punkt 4. Priser (lägg till en punkt)

- Vid direktleverans är flaskpriset 5 % högre än vid delad pall, avrundat till hela kronor, och frakten är 149 kr per låda om 6 flaskor. Båda ingår i totalpriset i kassan.

## Punkt 5. Betalning (lägg till efter första stycket)

Vid direktleverans debiteras ditt kort när du köper, inte när en pall stänger. Stycket om misslyckad dragning gäller bara delad pall.

## Punkt 7. Leverans (komplettera)

Ersätt raden om 2–3 veckor med:

- **Delad pall:** normalt 2–3 veckor efter att pallen har stängt, alltid inom 30 dagar.
- **Direktleverans:** normalt 5–10 arbetsdagar från att ordern är bekräftad och betald, alltid inom 30 dagar.

---

## Anmärkningar (ej publicerad text)

1. UPS nämns vid namn eftersom avtalet finns och tillåter vin. Budbee nämns fortfarande inte.
2. Sista meningen under Ålderskontroll följer Axels beslut 2026-10-30 (ingen avgift vid nekad ålderskontroll). Returkostnad när en direktleverans inte hämtas ut följer punkt 8 (faktisk returkostnad utan påslag) och ändras inte.
3. "Stryka vinet" är en tolkning av Axels lådregel: hans regel säger bara vad som gäller när en låda bryts. Strykning när lådan förblir full (t.ex. 12 → 6 flaskor från samma källa) är min tolkning och ingår i frågan till Axel.
4. Kassans text "Leveranstiden räknas från att ordern är bekräftad och betald" (messages/sv.json, directBoxBody) stämmer med utkastet.
5. Engelska /terms behöver motsvarande tillägg efter godkännande.
6. Beroende: de godkända villkoren (PR212) är ännu inte publicerade, kö 673a34bd. Tillägget kan publiceras i samma omgång.
