# Cursor-prompt: natural wine-navet mot natural-vs-organic-guiden, och Languedoc-påståenden

7 november 2026. Underlag: produktionssidorna samma kväll.

**Fynd**
1. **Kannibalisering.** /guides/what-is-natural-wine har ett långt avsnitt, "Natural wine vs organic wine vs biodynamic wine", som täcker samma ämne som /guides/natural-vs-organic-vs-biodynamic-wine (Grok, #151). Navet länkar inte till guiden. Google får två sidor om samma fråga och ingen signal om vilken som är huvudsidan.
2. **Felaktig mening i navet.** "In the EU, organic wine may contain added sulfur up to the limits above" hänvisar till gränsvärden som inte står ovanför.
3. **Languedoc-påstående i guiden.** Avsnittet "Our producers" i natural-vs-organic-guiden börjar med "PACT works with small producers in the Languedoc, around Béziers" och listar bara Languedoc-producenter. Katalogen har även viner från Loire, Beaujolais, Jura med flera. Samma typ av påstående som togs bort i #187 och #188.
4. **Svenska naturvinssidan** har kvar "Det är därifrån PACT importerar." i stycket om Languedoc.

**Lösning:** navet behåller en kort version av avsnittet och länkar till guiden, som blir sidan för den frågan. Languedoc-påståendena tas bort.

```
Three content fixes. Do not change URLs, canonical, hreflang or titles.

1. ENGLISH HUB /guides/what-is-natural-wine
   Replace the body of the section "Natural wine vs organic wine vs biodynamic wine"
   (keep the heading) with exactly this:

   Organic, biodynamic and natural wine are three different things, even when they
   overlap.

   Organic and biodynamic are certifications, mainly about how the grapes are
   farmed. Organic rules also limit sulfur and some cellar additives, but still allow
   cultured yeast and filtration. In the US, a wine labeled organic may not have any
   added sulfites, so a USDA-organic wine can be stricter on sulfur than many natural
   wines.

   Natural wine covers the whole chain, from vineyard to bottle, and has no legal
   definition. An organic wine is not automatically natural, and a natural wine is
   not always certified organic.

   For the rules behind each label, with sulfite limits for the EU, the US, Demeter
   and Vin Méthode Nature, see [Natural vs organic vs biodynamic wine](/guides/natural-vs-organic-vs-biodynamic-wine).

   Keep the FAQ "Is natural wine organic?" unchanged. Add the guide to the hub's
   English Further reading list if it is not there. Set the article's updated date
   to today.

2. ENGLISH GUIDE /guides/natural-vs-organic-vs-biodynamic-wine
   In the section "Our producers":
   - Remove the sentence "PACT works with small producers in the Languedoc, around
     Béziers. Their farming status, as recorded in our database:" and the three
     producer lists under it.
   - Keep the sentence "For every wine we list the additives and sulfites the
     producer reports."
   - If the section heading then has only that sentence, keep the heading.
   Report whether the producer list was hardcoded or read from the database.
   Set the article's updated date to today.

   Check the Swedish version of the same guide. If it has the same Languedoc
   sentence and producer list, remove them the same way and report before and after.
   Change nothing else in Swedish.

3. SWEDISH /guider/vad-ar-naturvin
   In the paragraph that starts "Languedoc är en av regionerna där arbetssättet är
   vanligt", remove only the sentence "Det är därifrån PACT importerar." Keep the
   rest of the paragraph and its links.

Rules:
- Report every piece of content removed, before and after
- Keep images, author, structured data and any field not mentioned
- No new npm packages, do not touch components/ui/
- Open a PR. Do not merge until Axel has approved it.

Expected result: the English hub has a four-paragraph section that links to the
natural-vs-organic guide, the guide no longer claims PACT works only in the
Languedoc, and the Swedish natural wine page no longer says PACT imports from there.
```

## Efter PR

Skicka PR-länken till Claude för granskning. Efter merge: begär indexering av /guides/what-is-natural-wine och /guides/natural-vs-organic-vs-biodynamic-wine.
