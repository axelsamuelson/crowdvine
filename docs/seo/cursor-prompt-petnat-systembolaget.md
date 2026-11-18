# Cursor-prompt: svensk pet nat-guide på Systembolaget

4 november 2026. Gäller /guider/basta-pet-nat-systembolaget. Samma mall som orange-guiden (#193, #194).

**Bakgrund:** #157 (2 nov) bytte sidan från den datadrivna listan till statisk text, utan bilder och priser. Sidan är er bästa Systembolaget-sida på klickfrekvens: 522 visningar, 33 klick, position 7,0 (5 aug till 4 nov). Största sökfrågan är "pet nat systembolaget" (167 visningar, position 6,2).

**Redan gjort i databasen (Claude, 4 nov), kategori petnat, svenska anteckningar:**
- Fakta som nu visas i faktalistan (årgång, alkohol, sortiment, "ekologisk") borttagna ur löptexten för 11 viner.
- Binner PetNat Storm: påståendet om Vin Méthode Nature-certifiering ersatt, på svenska och engelska.
- Chidaine, Colombe, Riedlin, Pequenos Rebentos och Puput: anteckningar som bara upprepade fakta omskrivna.

```
Apply the orange-list pattern from #193 and #194 to the Swedish pet nat
Systembolaget guide: /guider/basta-pet-nat-systembolaget.
Swedish page only. English /guides/best-pet-nat-systembolaget unchanged.

1. RENDERING
   Switch app/guider/basta-pet-nat-systembolaget/page.tsx back to
   buildSystembolagetRankedListMetadata and renderSystembolagetRankedListPage
   with category "petnat", as before #157.

2. CONTENT OBJECT (Swedish article in lib/guides/articles/best-pet-nat-wines-systembolaget.ts)
   - Turn on showRankedWineFacts, as the orange Swedish article does.
   - Keep author, byline, title, lede, meta and the six FAQs.
   - H1: "Bästa pet nat på Systembolaget 2026".
   - Keep the sections "Vårt urval i korthet" (rendered after the lede, wine names
     linked to their rows), "Så har vi valt", "Vad är pét-nat?" and "Pét-nat och mat".
   - In "Så har vi valt", keep the additives sentence about Systembolaget's data
     and Fio Piu Piu.
   - Restore the section "Vad vi inte listar" with the text from before #157:
     "Mousserande vin som bara har ett naturligt klingande ord på etiketten, utan
     belagd odling och källarpraxis. Pet nat är en metod. Den säger inte i sig hur
     druvorna odlats eller vad som tillsatts. Vi utgår från producenten, inte från
     stilnamnet." Give it heading.en "What we don't list" so the renderer can show
     avoid wines there if any are added later.
   - Remove the hardcoded "Listan" section with the per-wine blocks. Wines come from
     the database only.
   - Hub card description: remove "Inga priser."

3. CHECK
   Compare the wines in the old static list with the database list for category
   "petnat" (recommended, published). Report any wine that is in one but not the
   other. Binner PetNat Storm is in the database but was not in the static list.

Rules:
- Keep URL, canonical and the hreflang pair with the English page
- Report every piece of content removed, before and after
- No new npm packages, do not touch components/ui/
- Open a PR. Do not merge until Axel has approved it.

Expected result: the Swedish pet nat page shows images, prices, the ranked list with
fact rows (and bottle size when not 75 cl), the linked shortlist, byline, six FAQs,
and H1 "Bästa pet nat på Systembolaget 2026".
```

## Efter PR

Skicka PR-länken till Claude för granskning av förhandsvisningen. Begär indexering efter deploy.
