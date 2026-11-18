# Cursor-prompt: interna länkar till natural wine-navet

18 november 2026.

**Bakgrund:** /guides/what-is-natural-wine är indexerad och genomsöktes senast 8 november, efter omskrivningen i #189. Ändå har sidan bara 2 visningar sedan augusti. Google har alltså den nya versionen men rankar den utanför topp 100. Sökningen "natural wine" (83 visningar, position 15, 20 okt till 16 nov) går i stället till en annan sida, troligen /guides/worlds-best-natural-wine-producers, som är den starkaste engelska sidan (729 visningar, position 7,6). Orange-navet fick visningar dagen efter omskrivningen, så natural wine-navet beter sig annorlunda.

**Mål:** att de starka engelska sidorna pekar ut navet som huvudsidan för ämnet, med beskrivande ankartexter i löptexten, en länk per sida.

```
English pages only. Add contextual internal links to /guides/what-is-natural-wine.
Do not change Swedish content, URLs, canonical, hreflang, titles or meta.

1. RECON (report first, then change)
   List every English page that links to /guides/what-is-natural-wine today, and
   where: body text, Further reading, footer, nav or card. Do the same for
   /guides/worlds-best-natural-wine-producers so we can compare.

2. LINKS IN BODY TEXT (one per page, in the first section of body text where it fits)
   Link an existing phrase, or add one short sentence if no phrase fits. Use the
   anchor given for each page. Do not link the same page twice in the body.

   /guides/worlds-best-natural-wine-producers   anchor: "natural wine"
   /guides/worlds-best-natural-wines             anchor: "what natural wine is"
   /guides/worlds-best-orange-wines              anchor: "natural wine"
   /guides/worlds-best-natural-champagne         anchor: "natural wine"
   /guides/gang-of-four-wine                     anchor: "natural wine"
   /guides/beaujolais-natural-wine               anchor: "natural wine"
   /guides/jura-natural-wine                     anchor: "natural wine"
   /guides/georgia-natural-wine                  anchor: "natural wine"
   /guides/languedoc-natural-wine                anchor: "natural wine"
   English producer guides (jean-foillard, marcel-lapierre, guy-breton,
   jean-paul-thevenet, pierre-overnoy, jean-francois-ganevat, thierry-allemand,
   jacques-selosse, radikon, josko-gravner and any other English producer guide):
     the first natural mention of "natural wine" in the body, anchor "natural wine"

   If a sentence must be added, it must be true for the page and must not claim
   anything about PACT. Report every added sentence.

3. FURTHER READING
   On the English pages in step 2 that have a Further reading list without
   "What is natural wine?", add it as the first item.

4. ENGLISH HOME PAGE /en
   If the page has an introductory text block about natural wine, link the phrase
   "natural wine" there to /guides/what-is-natural-wine. If it has no such text,
   change nothing and report.

Rules:
- Exactly one new body link per page to the hub; do not change other links
- Report every page changed, with the sentence before and after
- Keep images, author, structured data and any field not mentioned
- No new npm packages, do not touch components/ui/
- Open a PR. Do not merge until Axel has approved it.

Expected result: every English guide links to /guides/what-is-natural-wine once in
the body text, and the recon shows how many internal links the hub had before and
after.
```

## Efter merge

Begär indexering av /guides/worlds-best-natural-wine-producers och /guides/worlds-best-natural-wines, så att Google läser om de nya länkarna. Följ upp visningarna för navet om två till tre veckor.
