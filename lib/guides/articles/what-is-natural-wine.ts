import type { GuideArticleContent } from "@/lib/guides/guide-types";

/**
 * Sulphur figures are ceilings or charter limits, not a typical dose.
 * EU 2019/934 Annex I Part B; EU 2021/1165 Annex V Part D (consolidated 2026-01-01);
 * Vin Méthode Nature charter; EU 1169/2011 Annex II (label above 10 mg/l).
 */
export const whatIsNaturalWineArticle: GuideArticleContent = {
  updated: "2026-11-03",
  slug: {
    en: "what-is-natural-wine",
    sv: "vad-ar-naturvin",
  },
  absoluteTitle: { en: true },
  title: {
    en: "What Is Natural Wine? Meaning, Sulfites and Organic vs Natural",
    sv: "Vad är naturvin? Definition, sulfiter och hur det görs",
  },
  meta: {
    en: "Natural wine means low intervention: organic grapes, wild fermentation and little or no added sulfites. What it tastes like, US and EU sulfite rules, and how it differs from organic wine.",
    sv: "Naturvin betyder låg intervention: ekologiska druvor, spontanjäsning och lite eller inget tillsatt svavel. Sulfiter och skillnaden mot ekologiskt vin.",
  },
  h1: {
    en: "What is natural wine?",
    sv: "Vad är naturvin?",
  },
  lede: {
    en: "Natural wine is wine made with as little intervention as possible. The grapes are farmed organically or biodynamically, fermentation starts on its own with the yeast that lives on the grapes and in the cellar, and little or no sulfur is added. Nothing is used to change the flavor, color or texture of the wine along the way.",
    sv: "Naturvin är vin gjort med låg intervention. Druvorna odlas typiskt ekologiskt eller biodynamiskt, och jäsningen sker spontant med druvans egen jäst i stället för ympad jäsning. I källaren tillsätts oftast lite eller inget svavel, och få eller inga andra tillsatser.",
  },
  breadcrumbShort: {
    en: "What is natural wine?",
    sv: "Vad är naturvin?",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "What is natural wine?",
      sv: "Vad är naturvin?",
    },
    description: {
      en: "The definition of natural wine: low intervention, sulfites, spontaneous fermentation and how it differs from organic and biodynamic wine.",
      sv: "Definitionen av naturvin: låg intervention, sulfiter, spontanjäsning och skillnaden mot ekologiskt och biodynamiskt vin.",
    },
  },
  sections: [
    {
      locales: ["sv"],
      heading: {
        en: "What is natural wine?",
        sv: "Naturvin i korthet",
      },
      body: {
        en: [
          "There is no shared legal definition of natural wine in Sweden or in the EU. Producers use the term for a way of working, not for a single rulebook.",
          "France has had a label since 2020, Vin Méthode Nature, run by the Syndicat de défense des vins naturels. It requires certified organic grapes (Agriculture Biologique or Nature & Progrès), hand harvesting, yeast from the vineyard and no additives except a possible small sulphur adjustment in the finished wine. The label is voluntary. It does not cover everything that is called natural wine.",
          "In practice, natural wine means few interventions from soil to bottle. The producer harvests and presses, then lets the grape and the place steer the fermentation. Clarity about farming and cellar work matters more than the word on the label, because anyone can use the word.",
        ],
        sv: [
          "Det finns ingen gemensam lagdefinition av naturvin i Sverige eller i EU. Begreppet används av producenter som delar ett arbetssätt, men inte ett regelverk.",
          "Frankrike har sedan 2020 en märkning, Vin Méthode Nature, via Syndicat de défense des vins naturels. Den kräver certifierat ekologiska druvor (Agriculture Biologique eller Nature & Progrès), handskörd, jäst från vingården och inga tillsatser utöver en möjlig liten svaveljustering på det färdiga vinet. Märkningen är frivillig och täcker inte allt som kallas naturvin.",
          "I praktiken betyder naturvin att ingreppen är få från jord till flaska. Producenten skördar och pressar, och låter sedan druva och plats styra jäsningen. Transparens om odling och källare väger tyngre än ordet på etiketten, eftersom vem som helst kan använda ordet.",
        ],
      },
    },
    {
      locales: ["sv"],
      heading: {
        en: "Natural wine and sulfites",
        sv: "Naturvin och sulfiter",
      },
      body: {
        en: [
          "Sulphur dioxide is used in many wines as protection against oxidation and unwanted microbial activity. Natural wine often has little or no sulphur added, and when it is added that typically happens late, at bottling. There is no official typical dose for the term natural wine, and no shared ceiling.",
          "What can be compared are legal ceilings, not an average addition. In the EU, total sulphur dioxide in wine other than sparkling wine and liqueur wine may not exceed 150 mg/l for red and 200 mg/l for white and rosé. When residual sugar is at least 5 g/l, those ceilings rise to 200 mg/l and 250 mg/l. Some styles have higher ceilings. Source: Commission Delegated Regulation (EU) 2019/934, Annex I, Part B.",
          "Organic wine has lower ceilings. For red wine with residual sugar below 2 g/l the ceiling is 100 mg/l. For white and rosé with residual sugar below 2 g/l the ceiling is 150 mg/l. For other organic wines the ceiling sits 30 mg/l below the ceiling in Regulation (EU) 2019/934. Source: Commission Implementing Regulation (EU) 2021/1165, Annex V, Part D.",
          "Vin Méthode Nature allows no added sulphur before or during fermentation. In the finished wine an adjustment may be made up to 30 mg/l total, measured as H2SO4 by Frantz Paul analysis, whatever the colour. Any addition has to be shown with its own logo. With no added sulphur the other logo is used, and analyses up to 20 mg/l of sulfites formed during fermentation can be accepted. Source: the charter at vinmethodenature.org.",
          "Fermentation often forms sulfites even when no sulphur is added. In the EU the words \"contains sulfites\" are required on the bottle when the level exceeds 10 mg/l, counted as total sulphur dioxide (Regulation (EU) No 1169/2011, Annex II). The line does not say that sulphur was added.",
        ],
        sv: [
          "Svaveldioxid används i många viner som skydd mot oxidation och oönskad mikrobiell aktivitet. I naturvin tillsätts oftast lite eller inget svavel, och när det tillsätts sker det typiskt sent, vid buteljering. Det finns ingen officiell typisk dos för begreppet naturvin, och inget gemensamt tak.",
          "Det som går att jämföra är lagstadgade tak, inte en genomsnittlig tillsats. I EU får totalt svaveldioxid i vin som inte är mousserande eller likörvin vara högst 150 mg/l för rött och 200 mg/l för vitt och rosé. När restsocker är minst 5 g/l höjs taken till 200 mg/l respektive 250 mg/l. Vissa stilar har högre tak. Källa: kommissionens delegerade förordning (EU) 2019/934, bilaga I, del B.",
          "Ekologiskt vin har lägre tak. För rött med restsocker under 2 g/l är taket 100 mg/l. För vitt och rosé med restsocker under 2 g/l är taket 150 mg/l. För övriga ekologiska viner ligger taket 30 mg/l under taket i förordning (EU) 2019/934. Källa: kommissionens genomförandeförordning (EU) 2021/1165, bilaga V, del D.",
          "Vin Méthode Nature tillåter inget tillsatt svavel före eller under jäsning. På färdigt vin får en justering göras upp till 30 mg/l totalt, mätt som H2SO4 med Frantz Paul-analys, oavsett färg. Tillsats ska synas med en egen logotyp. Utan tillsatt svavel används den andra logotypen, och analyser upp till 20 mg/l av sulfiter som bildats under jäsningen kan godkännas. Källa: chartern hos vinmethodenature.org.",
          "Jäsning bildar ofta sulfiter även när inget svavel tillsätts. I EU ska \"innehåller sulfiter\" stå på flaskan när halten överstiger 10 mg/l, räknat som totalt svaveldioxid (förordning (EU) nr 1169/2011, bilaga II). Märkningen säger alltså inte att svavel har tillsatts.",
        ],
      },
    },
    {
      locales: ["sv"],
      heading: {
        en: "Low intervention in the vineyard and the cellar",
        sv: "Låg intervention i vingården och källaren",
      },
      body: {
        en: [
          "Low intervention means the winemaker skips steps that steer flavour, colour or stability. Low intervention wine is the working method the term natural wine usually points to. In the vineyard the grapes are typically grown without synthetic pesticides or fertilisers, often organically or biodynamically, with or without a certificate. The harvest is often by hand.",
          "In the cellar, fermentation is typically spontaneous: the grape's own yeast starts it, rather than inoculated fermentation with a cultured yeast. Cultured yeast makes fermentation more predictable. Spontaneous fermentation varies more from one vintage to the next.",
          "Low intervention in the cellar also means that sugar, acid, enzymes and fining agents are usually left out, and that the wine is often not filtered. Conventional wine often uses several of those steps to keep flavour and appearance steady from year to year.",
        ],
        sv: [
          "Låg intervention betyder att vinmakaren avstår från ingrepp som styr smak, färg eller stabilitet. Naturvin med låg intervention är det arbetssätt begreppet brukar peka på. I vingården odlas druvorna typiskt utan syntetiska bekämpningsmedel och konstgödsel, ofta ekologiskt eller biodynamiskt, med eller utan certifikat. Skörden är ofta manuell.",
          "I källaren är jäsningen typiskt spontan: druvans egen jäst startar den, i stället för ympad jäsning med odlad jäst. Odlad jäst ger en mer förutsägbar jäsning. Spontanjäsning varierar mer mellan årgångar.",
          "Låg intervention i källaren betyder också att socker, syra, enzymer och klarningsmedel oftast uteblir, och att vinet ofta inte filtreras. Konventionellt vin använder ofta flera av de stegen för att göra smak och utseende jämna från år till år.",
        ],
      },
    },
    {
      locales: ["sv"],
      heading: {
        en: "Natural wine, organic and biodynamic: the difference",
        sv: "Naturvin, ekologiskt och biodynamiskt: skillnaden",
      },
      body: {
        en: [
          "Organic, biodynamic and natural wine are three different things, even when they overlap.",
          "Organic wine is a certification. Farming follows the EU rules for organic agriculture. In the cellar many additives are still allowed, including cultured yeast, and the sulphur ceiling is lower than for conventional wine but higher than what many natural-wine producers use.",
          "Biodynamic wine builds on organic farming plus biodynamic methods, often certified by Demeter. It is first of all a way of farming, with preparations and the farm treated as a whole. A biodynamic bottle can be natural wine, but the certificate does not by itself require spontaneous fermentation or no added sulphur.",
          "Natural wine sets expectations for the whole chain, but without a shared certificate. It typically includes organic or biodynamic farming and low intervention in the cellar. An organic bottle is therefore not automatically natural wine, and a natural wine is not always certified.",
        ],
        sv: [
          "Ekologiskt, biodynamiskt och naturvin är tre olika saker, även om de ofta överlappar.",
          "Ekologiskt vin är en certifiering. Odlingen följer EU:s regler för ekologiskt jordbruk. I källaren är många tillsatser fortfarande tillåtna, inklusive odlad jäst, och svaveltaket är lägre än för konventionellt vin men högre än vad många naturvinsproducenter använder.",
          "Biodynamiskt vin bygger på ekologisk odling plus biodynamiska metoder, ofta certifierat av Demeter. Det är i första hand ett odlingssätt, med preparat och gården sedd som en helhet. En biodynamisk flaska kan vara naturvin, men certifieringen styr inte i sig att jäsningen är spontan eller att svavel uteblir.",
          "Naturvin ställer krav på hela kedjan, men utan ett gemensamt certifikat. Typiskt ingår ekologisk eller biodynamisk odling och låg intervention i källaren. En ekologisk flaska är därför inte automatiskt naturvin, och ett naturvin är inte alltid certifierat.",
        ],
      },
    },
    {
      locales: ["sv"],
      heading: {
        en: "Is there natural wine at Systembolaget?",
        sv: "Finns naturvin på Systembolaget?",
      },
      body: {
        en: [
          "Yes. Systembolaget has a search filter for natural wine. The results are wines that the producer or the supplier itself describes that way, and the filter is not a certification.",
          "An independent run-through of bottles in the assortment is in [Natural wine at Systembolaget 2026](/guides/best-natural-wines-systembolaget). The list is updated on an ongoing basis. PACT does not sell at Systembolaget and earns nothing from which wines are on it.",
        ],
        sv: [
          "Ja. Systembolaget har ett sökfilter för naturvin. Träffarna är viner som producenten eller leverantören själv beskriver så, och filtret är inte en certifiering.",
          "En oberoende genomgång av flaskor i sortimentet finns i [Naturvin på Systembolaget 2026](/guider/basta-naturvinerna-pa-systembolaget). Listan uppdateras löpande. PACT säljer inte på Systembolaget och tjänar ingenting på vilka viner som står där.",
        ],
      },
    },
    {
      locales: ["sv"],
      heading: {
        en: "What natural wine tastes like",
        sv: "Så smakar naturvin",
      },
      body: {
        en: [
          "Natural wine does not taste like one thing. The difference sits in the grape, the place and the vintage, not in a shared flavour profile.",
          "Red natural wine is often lighter in colour and has softer tannins than many conventional red wines. White natural wine can have more texture, because spontaneous fermentation and little sulphur leave more of the grape in the wine. [Orange wine](/guides/what-is-orange-wine) is white wine fermented on the skins. The colour runs from gold to amber, and it is not the same thing as natural wine.",
          "Sparkling natural wine is often made as pét-nat (pet nat), where fermentation finishes in the bottle. More on that style is in the guide to [sparkling natural wine](/guides/best-sparkling-natural-wines-systembolaget).",
          "Unfiltered wine can look cloudy. The particles are leftover yeast. A light spritz in a still wine can come from fermentation continuing slowly in the bottle. Both are common, and neither means by itself that the wine is faulty.",
        ],
        sv: [
          "Naturvin smakar inte på ett sätt. Skillnaden sitter i druva, plats och årgång, inte i en gemensam smakprofil.",
          "Rött naturvin är ofta ljusare i färgen och har mjukare tanniner än många konventionella röda viner. Vitt naturvin kan ha mer textur, eftersom spontanjäsning och lite svavel lämnar mer av druvan kvar. [Orange vin](/guider/vad-ar-orange-vin) är vitt vin som jäst med skalen. Färgen går från guld till bärnsten, och det är inte samma sak som naturvin.",
          "Mousserande naturvin görs ofta som pét-nat (pet nat), där jäsningen avslutas i flaskan. Mer om den stilen finns i genomgången av [mousserande naturvin](/guider/basta-mousserande-naturviner-systembolaget).",
          "Ofiltrerat vin kan se grumligt ut. Partiklarna är jästrester. En lätt kolsyra i ett stilla vin kan komma av att jäsningen fortsätter långsamt i flaskan. Båda förekommer ofta, och ingen av dem betyder i sig att vinet är felaktigt.",
        ],
      },
    },
    {
      locales: ["sv"],
      heading: {
        en: "White natural wine",
        sv: "Vitt naturvin",
      },
      body: {
        en: [
          "White natural wine is often more textured and site-driven than conventional white. White grapes are more delicate than red and lack the protection of skin tannins, so the style needs precision in vineyard and cellar. The bottles are made with few or no additives and can vary more from vintage to vintage.",
          "Two broad directions show up often. Oxidative styles see a little oxygen during ageing and can give notes of almond, honey and dried fruit, for example ouillé Savagnin from the Jura. Reductive styles are kept more protected from oxygen and keep fresher fruit. Many producers work somewhere in between.",
          "Do not serve ice-cold: light styles around 10-11°C, fuller or oxidative styles around 12-14°C. Light bottles suit fish, shellfish and vegetables; fuller ones suit oily fish and soft cheeses. Browse our [white natural wine](/wine/white-natural-wine).",
        ],
        sv: [
          "Vitt naturvin är ofta mer texturerat och platsbundet än konventionellt vitt. Vita druvor är känsligare än röda och saknar skaltanninernas skydd, så stilen kräver precision i både vingård och källare. Flaskorna görs med få eller inga tillsatser och kan variera mer mellan årgångar.",
          "Två huvudriktningar syns ofta. Oxiderande stilar får lite syre under lagringen och kan ge toner av mandel, honung och torkad frukt, till exempel ouillé Savagnin från Jura. Reducerande stilar skyddas mer från syre och behåller frisk frukt. Många producenter arbetar någonstans mittemellan.",
          "Servera inte iskallt: lätta stilar runt 10-11°C, fylligare eller oxiderande stilar runt 12-14°C. Lätta flaskor passar fisk, skaldjur och grönsaker; fylligare passar fetare fisk och mjuka ostar. Se vårt urval av [vitt naturvin](/vin/vitt-naturvin).",
        ],
      },
    },
    {
      locales: ["sv"],
      heading: {
        en: "Red natural wine",
        sv: "Rött naturvin",
      },
      body: {
        en: [
          "Red natural wine is a spectrum rather than one style. Many bottles are lighter in colour and softer in tannin than conventional red, often because extraction is kept back. A light Cinsault and a structured old-vine Carignan can both be natural wine, but they work in different contexts.",
          "Carbonic maceration is common: whole clusters ferment in a carbon-dioxide-rich vessel, so fermentation happens inside each grape. The result is fruity, soft and easy to drink, with low tannin. It is the method the Gang of Four used with Gamay in Beaujolais in the 1980s.",
          "Serve cooler than ordinary red more often than not: light styles at 13-14°C, medium-bodied at 15-16°C. Light wines suit charcuterie, pizza and grilled chicken; fuller ones suit stews and mature cheeses. Browse our [red natural wine](/wine/red-natural-wine).",
        ],
        sv: [
          "Rött naturvin är ett spektrum snarare än en stil. Många flaskor är ljusare i färgen och mjukare i tanninen än konventionellt rött, ofta för att extraktionen hålls tillbaka. Ett lätt Cinsault och en strukturerad Carignan från gamla stockar kan båda vara naturvin, men de fungerar i olika sammanhang.",
          "Kolsyremaceration är vanlig: hela klasar jäser i en koldioxidrik miljö, så jäsningen sker inuti druvan. Resultatet blir fruktigt, mjukt och lätt att dricka, med låg tannin. Metoden är densamma som Gang of Four använde med Gamay i Beaujolais på 1980-talet.",
          "Servera ofta svalare än vanligt rött: lätta stilar 13-14°C, medelfylliga 15-16°C. Lätta viner passar chark, pizza och grillad kyckling; fylligare passar grytor och mogna ostar. Se vårt urval av [rött naturvin](/vin/rott-naturvin).",
        ],
      },
    },
    {
      locales: ["sv"],
      heading: {
        en: "Where is natural wine made?",
        sv: "Var görs naturvin?",
      },
      body: {
        en: [
          "Natural wine is made in many countries today. The movement grew up in France, above all in Beaujolais, the Jura and the Loire. In the 1980s, producers influenced by the chemist Jules Chauvet began farming organically and vinifying with few or no additives.",
          "Languedoc is one of the regions where the approach is common. Schist, limestone and old vines give character to Carignan, Grenache, Syrah and Cinsault. That is where PACT imports from. Read more in the guide to [natural wine from Languedoc](/guides/languedoc-natural-wine). If you want to get to know one of those farms, start with a [natural wine box](/wine/natural-wine-box): six bottles from the same producer.",
        ],
        sv: [
          "Naturvin görs i dag i många länder. Rörelsen växte fram i Frankrike, framför allt i Beaujolais, Jura och Loire. På 1980-talet började producenter, under inflytande av kemisten Jules Chauvet, odla ekologiskt och vinifiera med få eller inga tillsatser.",
          "Languedoc är en av regionerna där arbetssättet är vanligt. Skiffer, kalk och gamla stockar ger karaktär åt Carignan, Grenache, Syrah och Cinsault. Det är därifrån PACT importerar. Läs mer i guiden om [naturvin från Languedoc](/guider/naturvin-languedoc). Vill du lära känna en gård därifrån kan du börja med en [naturvinslåda](/vin/naturvin-lada): sex flaskor från samma producent.",
        ],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "What does natural wine mean?",
        sv: "",
      },
      body: {
        en: [
          "There is no legal definition of natural wine in the United States or the European Union. The term describes a way of working, not a set of rules, and anyone can put it on a label.",
          "The closest thing to a standard is in France. Since 2020 the Syndicat de défense des vins naturels has run a voluntary label, Vin Méthode Nature. It requires certified organic grapes, hand harvesting, fermentation with native yeast and no additives, apart from a possible small sulfur addition in the finished wine. Most wines sold as natural wine do not carry the label.",
          "In practice, natural wine means few interventions from vineyard to bottle. The grower harvests and presses, then lets the grapes and the place steer the fermentation. How a wine was farmed and made tells you more than the word on the label.",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "Low intervention and zero-zero wine",
        sv: "",
      },
      body: {
        en: [
          "Low intervention wine is the working method the term natural wine points to. In the vineyard, grapes are grown without synthetic pesticides or fertilizers, often organically or biodynamically, with or without a certificate, and usually picked by hand.",
          "In the cellar, fermentation is spontaneous: the grapes' own yeast starts it, instead of a cultured yeast added by the winemaker. Cultured yeast makes fermentation predictable. Native fermentation varies more from one vintage to the next, which is part of the point.",
          "Low intervention also means leaving out the steps conventional winemaking uses to keep a wine consistent from year to year: added sugar, acid, enzymes and fining agents. Natural wines are often bottled unfined and unfiltered.",
          "Zero-zero is the strictest form: nothing added and nothing taken away. No added sulfur at any stage, and no fining or filtration.",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "Natural wine and sulfites",
        sv: "",
      },
      body: {
        en: [
          "Sulfur dioxide protects wine against oxidation and unwanted microbes, and most wines get it at several stages. Natural wine usually gets little or none, and when it is added it is typically a small dose at bottling. There is no agreed maximum for natural wine.",
          "What can be compared are legal limits.",
          "**United States.** A wine label must say \"contains sulfites\" when the wine has 10 parts per million or more of total sulfur dioxide (27 CFR 4.32(e), enforced by the Alcohol and Tobacco Tax and Trade Bureau). Fermentation forms some sulfites on its own, so the statement appears on many wines with no sulfur added. It tells you the level, not whether sulfur was added.",
          "**European Union.** Total sulfur dioxide may not exceed 150 mg/l for dry red wine and 200 mg/l for dry white and rosé, with higher limits for sweeter wines (Commission Delegated Regulation (EU) 2019/934, Annex I, Part B). Organic wine in the EU has lower limits: 100 mg/l for dry red and 150 mg/l for dry white and rosé (Commission Implementing Regulation (EU) 2021/1165, Annex V, Part D). The \"contains sulphites\" statement is required above 10 mg/l (Regulation (EU) No 1169/2011, Annex II).",
          "**Vin Méthode Nature.** No sulfur may be added before or during fermentation. The finished wine may be adjusted up to 30 mg/l total sulfur dioxide, and a wine with sulfur added must carry its own version of the logo. Wines with no added sulfur may show up to 20 mg/l of sulfites formed during fermentation.",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "Natural wine vs organic wine vs biodynamic wine",
        sv: "",
      },
      body: {
        en: [
          "Organic, biodynamic and natural wine are three different things, even when they overlap.",
          "**Organic wine** is a certification. What it allows in the cellar depends on where the wine is labeled.",
          "In the United States there are two categories, set by the USDA National Organic Program. A wine labeled **organic**, with the USDA organic seal, may not have any added sulfites, and the naturally occurring level must stay below 10 ppm. A wine labeled **made with organic grapes** may have added sulfur dioxide up to 100 ppm, but may not use the USDA seal. In the EU, organic wine may contain added sulfur up to the limits above, and many cellar additives are still allowed, including cultured yeast.",
          "That makes a USDA-organic wine stricter on sulfur than many natural wines, which often get a small dose at bottling. It does not make it a natural wine: the organic rules govern ingredients and sulfur, not whether fermentation was spontaneous or the wine was fined and filtered.",
          "**Biodynamic wine** builds on organic farming with additional practices, treating the farm as a whole. It is often certified by Demeter. Biodynamic certification is mainly about farming. A biodynamic wine can be natural, but the certificate does not by itself require native yeast or no added sulfur.",
          "**Natural wine** sets expectations for the whole chain, from vineyard to bottle, without a shared certificate. An organic wine is not automatically natural, and a natural wine is not always certified organic.",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "What does natural wine taste like?",
        sv: "",
      },
      body: {
        en: [
          "Natural wine does not taste like one thing. Grape, place and vintage matter more than the method.",
          "Red natural wine is often lighter in color and softer in tannin than conventional red. White natural wine often has more texture, because native fermentation and little sulfur leave more of the grape in the glass.",
          "Unfiltered wine can look cloudy. The haze is leftover yeast and grape particles. A light fizz in a still wine can come from fermentation finishing slowly in the bottle. Both are common in natural wine, and neither on its own means the wine is faulty.",
          "**Glou glou** is French slang for the sound of gulping, and natural wine drinkers use it for light, fresh, easy-drinking wines meant to be enjoyed young. Many of them are **chillable reds**: light reds, often Gamay or Cinsault, that taste best at cellar temperature or slightly below.",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "Natural wine styles",
        sv: "",
      },
      body: {
        en: [
          "**Orange wine and skin contact wine.** Orange wine is white wine fermented on its skins, like a red. The skins give an amber color, tannin and texture. Skin contact is a method, not a guarantee of natural wine, but many of the best-known orange wines come from natural producers. Read more in [What is orange wine?](/guides/what-is-orange-wine)",
          "**Pét-nat.** Short for pétillant naturel, a sparkling wine bottled before the first fermentation has finished, so the bubbles come from that same fermentation. Pét-nats are often cloudy and more gently sparkling than Champagne.",
          "**Carbonic maceration.** Whole bunches ferment in a tank filled with carbon dioxide, so fermentation starts inside each grape. The result is fruity and soft, with low tannin. It is the method behind many Beaujolais natural wines, made famous by the [Gang of Four](/guides/gang-of-four-wine) in Morgon in the 1980s.",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "White natural wine",
        sv: "",
      },
      body: {
        en: [
          "White grapes are more delicate than red and lack the protection of skin tannin, so white natural wine needs precision in the vineyard and the cellar. The wines are made with few or no additives and can vary more from vintage to vintage.",
          "Two directions show up often. Oxidative styles see a little oxygen during aging and can give notes of almond, honey and dried fruit, as in Savagnin from the [Jura](/guides/jura-natural-wine). Reductive styles are kept protected from oxygen and keep fresher fruit. Many producers work in between.",
          "Do not serve them ice-cold: light styles around 50-52°F (10-11°C), fuller or oxidative styles around 54-57°F (12-14°C).",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "Red natural wine",
        sv: "",
      },
      body: {
        en: [
          "Red natural wine is a spectrum. Many bottles are lighter and softer than conventional red, often because the winemaker keeps extraction gentle. A light Cinsault and a structured old-vine Carignan can both be natural wine, but they suit different meals.",
          "Serve cooler than you would expect: light reds at 55-57°F (13-14°C), medium-bodied at 59-61°F (15-16°C).",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "Mousy wine: the fault to know about",
        sv: "",
      },
      body: {
        en: [
          "Mousiness is a fault caused by spoilage yeasts (Brettanomyces) and lactic acid bacteria, which produce compounds that taste like corn chips, popcorn or a mouse cage. It is hard to smell, because the compounds only become volatile once the wine mixes with saliva, so it shows up on the finish after you swallow. Sulfur dioxide helps prevent it, which is why wines made with little or no sulfur are more exposed. A mousy bottle is faulty, not a style.",
        ],
        sv: [],
      },
    },
    {
      locales: ["en"],
      heading: {
        en: "Where is natural wine made?",
        sv: "",
      },
      body: {
        en: [
          "The movement took shape in France. In the 1980s, growers in [Beaujolais](/guides/beaujolais-natural-wine) influenced by the chemist Jules Chauvet began farming organically and vinifying with little or no sulfur. The Jura and the Loire followed, and Languedoc and Roussillon are now home to many natural growers.",
          "Today natural wine is made around the world: Italy, Spain, Austria, Slovenia, [Georgia](/guides/georgia-natural-wine), where wine has been fermented in clay qvevri for thousands of years, and the United States, Australia, South Africa and Chile. Our list of [the world's best natural wine producers](/guides/worlds-best-natural-wine-producers) covers 116 of them, and [the world's best natural wines](/guides/worlds-best-natural-wines) picks the bottles.",
        ],
        sv: [],
      },
    },
  ],
  faqs: [
    {
      question: {
        en: "What is natural wine?",
        sv: "Vad är naturvin?",
      },
      answer: {
        en: "Natural wine is low-intervention wine: organically or biodynamically farmed grapes, spontaneous fermentation with native yeast, and little or no added sulfur. There is no legal definition in the US or the EU.",
        sv: "Naturvin är vin med låg intervention: druvorna odlas typiskt ekologiskt eller biodynamiskt, jäsningen är spontan och i källaren tillsätts oftast lite eller inget svavel. Det finns ingen gemensam lagdefinition.",
      },
    },
    {
      question: {
        en: "Does natural wine have sulfites?",
        sv: "Innehåller naturvin sulfiter?",
      },
      answer: {
        en: "Usually little or no added sulfites. Fermentation forms some sulfites on its own, so many natural wines still carry \"contains sulfites\", which US labels require at 10 ppm or more.",
        sv: "Ofta lite eller inga tillsatta sulfiter. Jäsning kan ändå bilda sulfiter, och märkningen \"innehåller sulfiter\" krävs i EU över 10 mg/l. Inom Vin Méthode Nature får tillsatt svavel på färdigt vin ge högst 30 mg/l totalt, mätt som H2SO4.",
      },
    },
    {
      question: {
        en: "Is natural wine organic?",
        sv: "Är naturvin ekologiskt?",
      },
      answer: {
        en: "Not by definition. Most natural wine is made from organically or biodynamically farmed grapes, with or without a certificate. In the US, a wine labeled \"organic\" may have no added sulfites, while \"made with organic grapes\" allows up to 100 ppm.",
        sv: "Inte per definition. Många odlar ekologiskt eller biodynamiskt, med eller utan certifikat. Ekologiskt vin får fortfarande innehålla tillsatser i källaren, inklusive odlad jäst.",
      },
    },
    {
      question: {
        en: "What is the difference between natural wine and orange wine?",
        sv: "Är naturvin samma som orange vin?",
      },
      answer: {
        en: "Orange wine is white wine fermented on its skins. It can be natural wine, but skin contact is a method, not a definition.",
        sv: "Nej. Orange vin är vitt vin som jäst med skalen. Det kan vara naturvin, men skalkontakt är en metod. Läs mer i [Vad är orange vin?](/guider/vad-ar-orange-vin).",
      },
    },
    {
      locales: ["sv"],
      question: {
        en: "",
        sv: "Var köper man naturvin i Sverige?",
      },
      answer: {
        en: "",
        sv: "På Systembolaget, som har ett filter för naturvin. Se [Naturvin på Systembolaget 2026](/guider/basta-naturvinerna-pa-systembolaget). Det går också att beställa från vissa butiker utomlands. Reglerna beskrivs i [Köpa naturvin online i Sverige](/guider/kopa-naturvin-online).",
      },
    },
    {
      locales: ["en"],
      question: {
        en: "Why is natural wine cloudy?",
        sv: "",
      },
      answer: {
        en: "Many natural wines are bottled unfined and unfiltered, so leftover yeast and grape particles stay in the wine. It is normal and not a fault.",
        sv: "",
      },
    },
    {
      locales: ["en"],
      question: {
        en: "What is a mousy wine?",
        sv: "",
      },
      answer: {
        en: "A fault caused by spoilage microbes that gives a corn-chip or mouse-cage taste on the finish. Wines with little or no sulfur are more exposed to it.",
        sv: "",
      },
    },
  ],
  internalLinks: [
    {
      label: {
        en: "What is orange wine? →",
        sv: "Vad är orange vin? →",
      },
      href: {
        en: "/guides/what-is-orange-wine",
        sv: "/guider/vad-ar-orange-vin",
      },
    },
    {
      label: {
        en: "",
        sv: "Mousserande naturvin →",
      },
      href: {
        en: "/guides/best-sparkling-natural-wines-systembolaget",
        sv: "/guider/basta-mousserande-naturviner-systembolaget",
      },
    },
    {
      label: {
        en: "Explore natural wine online →",
        sv: "Utforska naturvin online →",
      },
      href: {
        en: "/wine",
        sv: "/vin",
      },
    },
    {
      label: {
        en: "White natural wine →",
        sv: "Vitt naturvin →",
      },
      href: {
        en: "/wine/white-natural-wine",
        sv: "/vin/vitt-naturvin",
      },
    },
    {
      label: {
        en: "Red natural wine →",
        sv: "Rött naturvin →",
      },
      href: {
        en: "/wine/red-natural-wine",
        sv: "/vin/rott-naturvin",
      },
    },
    {
      label: {
        en: "Orange natural wine →",
        sv: "Orange naturvin →",
      },
      href: {
        en: "/wine/orange-natural-wine",
        sv: "/vin/orange-naturvin",
      },
    },
    {
      label: {
        en: "The world's 100 best natural wine producers →",
        sv: "Världens 100 bästa naturvinsproducenter →",
      },
      href: {
        en: "/guides/worlds-best-natural-wine-producers",
        sv: "/guider/varldens-basta-naturvinsproducenter",
      },
    },
    {
      label: {
        en: "",
        sv: "Naturvin från Languedoc →",
      },
      href: {
        en: "/guides/languedoc-natural-wine",
        sv: "/guider/naturvin-languedoc",
      },
    },
    {
      label: {
        en: "",
        sv: "Naturvin på Systembolaget: de bästa 2026 →",
      },
      href: {
        en: "/guides/best-natural-wines-systembolaget",
        sv: "/guider/basta-naturvinerna-pa-systembolaget",
      },
    },
    {
      label: {
        en: "",
        sv: "Bästa röda naturviner på Systembolaget 2026 →",
      },
      href: {
        en: "/guides/best-red-natural-wines-systembolaget",
        sv: "/guider/basta-roda-naturviner-systembolaget",
      },
    },
    {
      label: {
        en: "",
        sv: "Köpa naturvin online i Sverige →",
      },
      href: {
        en: "/guides/buy-natural-wine-online-sweden",
        sv: "/guider/kopa-naturvin-online",
      },
    },
    {
      label: { en: "The Gang of Four →", sv: "" },
      href: {
        en: "/guides/gang-of-four-wine",
        sv: "/guider/gang-of-four-wine",
      },
    },
    {
      label: { en: "Natural wine from the Jura →", sv: "" },
      href: {
        en: "/guides/jura-natural-wine",
        sv: "/guider/jura-natural-wine",
      },
    },
    {
      label: { en: "Natural wine from Beaujolais →", sv: "" },
      href: {
        en: "/guides/beaujolais-natural-wine",
        sv: "/guider/beaujolais-natural-wine",
      },
    },
    {
      label: { en: "Natural wine from Georgia →", sv: "" },
      href: {
        en: "/guides/georgia-natural-wine",
        sv: "/guider/georgia-natural-wine",
      },
    },
    {
      label: { en: "The world's best natural wines →", sv: "" },
      href: {
        en: "/guides/worlds-best-natural-wines",
        sv: "/guider/varldens-basta-naturviner",
      },
    },
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Natural wine",
  },
};
