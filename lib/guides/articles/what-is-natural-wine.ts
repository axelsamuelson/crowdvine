import type { GuideArticleContent } from "@/lib/guides/guide-types";

/**
 * Sulphur figures are ceilings or charter limits, not a typical dose.
 * EU 2019/934 Annex I Part B; EU 2021/1165 Annex V Part D (consolidated 2026-01-01);
 * Vin Méthode Nature charter; EU 1169/2011 Annex II (label above 10 mg/l).
 */
export const whatIsNaturalWineArticle: GuideArticleContent = {
  updated: "2026-10-12",
  slug: {
    en: "what-is-natural-wine",
    sv: "vad-ar-naturvin",
  },
  title: {
    en: "What is natural wine? Definition, sulfites, how it's made",
    sv: "Vad är naturvin? Definition, sulfiter och hur det görs",
  },
  meta: {
    en: "Natural wine means low intervention: organic grapes, spontaneous fermentation and little or no added sulphur. Sulfites, and how it differs from organic wine.",
    sv: "Naturvin betyder låg intervention: ekologiska druvor, spontanjäsning och lite eller inget tillsatt svavel. Sulfiter och skillnaden mot ekologiskt vin.",
  },
  h1: {
    en: "What is natural wine?",
    sv: "Vad är naturvin?",
  },
  lede: {
    en: "Natural wine is wine made with low intervention. The grapes are typically farmed organically or biodynamically, and fermentation is spontaneous, with the grape's own yeast rather than inoculated fermentation. In the cellar, little or no sulphur is added, and few or no other additives.",
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
      heading: {
        en: "What is natural wine?",
        sv: "Vad är naturvin?",
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
      heading: {
        en: "What natural wine tastes like",
        sv: "Så smakar naturvin",
      },
      body: {
        en: [
          "Natural wine does not taste like one thing. The difference sits in the grape, the place and the vintage, not in a shared flavour profile.",
          "[Red natural wine](/guides/what-is-red-natural-wine) is often lighter in colour and has softer tannins than many conventional red wines. [White natural wine](/guides/what-is-white-natural-wine) can have more texture, because spontaneous fermentation and little sulphur leave more of the grape in the wine. [Orange wine](/guides/what-is-orange-wine) is white wine fermented on the skins. The colour runs from gold to amber, and it is not the same thing as natural wine.",
          "Sparkling natural wine is often made as pét-nat (pet nat), where fermentation finishes in the bottle. More on that style is in the guide to [sparkling natural wine](/guides/best-sparkling-natural-wines-systembolaget).",
          "Unfiltered wine can look cloudy. The particles are leftover yeast. A light spritz in a still wine can come from fermentation continuing slowly in the bottle. Both are common, and neither means by itself that the wine is faulty.",
        ],
        sv: [
          "Naturvin smakar inte på ett sätt. Skillnaden sitter i druva, plats och årgång, inte i en gemensam smakprofil.",
          "[Rött naturvin](/guider/vad-ar-rott-naturvin) är ofta ljusare i färgen och har mjukare tanniner än många konventionella röda viner. [Vitt naturvin](/guider/vad-ar-vitt-naturvin) kan ha mer textur, eftersom spontanjäsning och lite svavel lämnar mer av druvan kvar. [Orange vin](/guider/vad-ar-orange-vin) är vitt vin som jäst med skalen. Färgen går från guld till bärnsten, och det är inte samma sak som naturvin.",
          "Mousserande naturvin görs ofta som pét-nat (pet nat), där jäsningen avslutas i flaskan. Mer om den stilen finns i genomgången av [mousserande naturvin](/guider/basta-mousserande-naturviner-systembolaget).",
          "Ofiltrerat vin kan se grumligt ut. Partiklarna är jästrester. En lätt kolsyra i ett stilla vin kan komma av att jäsningen fortsätter långsamt i flaskan. Båda förekommer ofta, och ingen av dem betyder i sig att vinet är felaktigt.",
        ],
      },
    },
    {
      heading: {
        en: "Where is natural wine made?",
        sv: "Var görs naturvin?",
      },
      body: {
        en: [
          "Natural wine is made in many countries today. The movement grew up in France, above all in Beaujolais, the Jura and the Loire. In the 1980s, producers influenced by the chemist Jules Chauvet began farming organically and vinifying without additives.",
          "Languedoc is one of the regions where the approach is common. Schist, limestone and old vines give character to Carignan, Grenache, Syrah and Cinsault. That is where PACT imports from. Read more in the guide to [natural wine from Languedoc](/guides/languedoc-natural-wine). If you want to get to know one of those farms, start with a [natural wine box](/wine/natural-wine-box): six bottles from the same producer.",
        ],
        sv: [
          "Naturvin görs i dag i många länder. Rörelsen växte fram i Frankrike, framför allt i Beaujolais, Jura och Loire. På 1980-talet började producenter, under inflytande av kemisten Jules Chauvet, odla ekologiskt och vinifiera utan tillsatser.",
          "Languedoc är en av regionerna där arbetssättet är vanligt. Skiffer, kalk och gamla stockar ger karaktär åt Carignan, Grenache, Syrah och Cinsault. Det är därifrån PACT importerar. Läs mer i guiden om [naturvin från Languedoc](/guider/naturvin-languedoc). Vill du lära känna en gård därifrån kan du börja med en [naturvinslåda](/vin/naturvin-lada): sex flaskor från samma producent.",
        ],
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
        en: "Natural wine is low-intervention wine: the grapes are typically farmed organically or biodynamically, fermentation is spontaneous and the cellar usually adds little or no sulphur. There is no shared legal definition.",
        sv: "Naturvin är vin med låg intervention: druvorna odlas typiskt ekologiskt eller biodynamiskt, jäsningen är spontan och i källaren tillsätts oftast lite eller inget svavel. Det finns ingen gemensam lagdefinition.",
      },
    },
    {
      question: {
        en: "Does natural wine contain sulfites?",
        sv: "Innehåller naturvin sulfiter?",
      },
      answer: {
        en: "Often little or no added sulfites. Fermentation can still form sulfites, and the EU requires the words \"contains sulfites\" above 10 mg/l. Under Vin Méthode Nature, added sulphur in the finished wine may not take the total above 30 mg/l, measured as H2SO4.",
        sv: "Ofta lite eller inga tillsatta sulfiter. Jäsning kan ändå bilda sulfiter, och märkningen \"innehåller sulfiter\" krävs i EU över 10 mg/l. Inom Vin Méthode Nature får tillsatt svavel på färdigt vin ge högst 30 mg/l totalt, mätt som H2SO4.",
      },
    },
    {
      question: {
        en: "Is natural wine organic?",
        sv: "Är naturvin ekologiskt?",
      },
      answer: {
        en: "Not by definition. Many growers farm organically or biodynamically, with or without a certificate. Organic wine may still contain cellar additives, including cultured yeast.",
        sv: "Inte per definition. Många odlar ekologiskt eller biodynamiskt, med eller utan certifikat. Ekologiskt vin får fortfarande innehålla tillsatser i källaren, inklusive odlad jäst.",
      },
    },
    {
      question: {
        en: "Is natural wine the same as orange wine?",
        sv: "Är naturvin samma som orange vin?",
      },
      answer: {
        en: "No. Orange wine is white wine fermented on the skins. It can be natural wine, but skin contact is a method. Read more in [What is orange wine?](/guides/what-is-orange-wine).",
        sv: "Nej. Orange vin är vitt vin som jäst med skalen. Det kan vara naturvin, men skalkontakt är en metod. Läs mer i [Vad är orange vin?](/guider/vad-ar-orange-vin).",
      },
    },
    {
      question: {
        en: "Where do you buy natural wine in Sweden?",
        sv: "Var köper man naturvin i Sverige?",
      },
      answer: {
        en: "At Systembolaget, which has a filter for natural wine. See [Natural wine at Systembolaget 2026](/guides/best-natural-wines-systembolaget). It is also possible to order from some shops abroad. The rules are described in [Buying natural wine online in Sweden](/guides/buy-natural-wine-online-sweden).",
        sv: "På Systembolaget, som har ett filter för naturvin. Se [Naturvin på Systembolaget 2026](/guider/basta-naturvinerna-pa-systembolaget). Det går också att beställa från vissa butiker utomlands. Reglerna beskrivs i [Köpa naturvin online i Sverige](/guider/kopa-naturvin-online).",
      },
    },
  ],
  internalLinks: [
    {
      label: {
        en: "What is red natural wine? →",
        sv: "Vad är rött naturvin? →",
      },
      href: {
        en: "/guides/what-is-red-natural-wine",
        sv: "/guider/vad-ar-rott-naturvin",
      },
    },
    {
      label: {
        en: "What is white natural wine? →",
        sv: "Vad är vitt naturvin? →",
      },
      href: {
        en: "/guides/what-is-white-natural-wine",
        sv: "/guider/vad-ar-vitt-naturvin",
      },
    },
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
        en: "Sparkling natural wine →",
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
        en: "/wine/natural-wine",
        sv: "/vin/naturvin",
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
        en: "",
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
        en: "Natural wine from Languedoc →",
        sv: "Naturvin från Languedoc →",
      },
      href: {
        en: "/guides/languedoc-natural-wine",
        sv: "/guider/naturvin-languedoc",
      },
    },
    {
      label: {
        en: "Natural wine at Systembolaget: the best 2026 →",
        sv: "Naturvin på Systembolaget: de bästa 2026 →",
      },
      href: {
        en: "/guides/best-natural-wines-systembolaget",
        sv: "/guider/basta-naturvinerna-pa-systembolaget",
      },
    },
    {
      label: {
        en: "Best red natural wines at Systembolaget 2026 →",
        sv: "Bästa röda naturviner på Systembolaget 2026 →",
      },
      href: {
        en: "/guides/best-red-natural-wines-systembolaget",
        sv: "/guider/basta-roda-naturviner-systembolaget",
      },
    },
    {
      label: {
        en: "Buying natural wine online in Sweden →",
        sv: "Köpa naturvin online i Sverige →",
      },
      href: {
        en: "/guides/buy-natural-wine-online-sweden",
        sv: "/guider/kopa-naturvin-online",
      },
    },
  ],
  jsonLdAbout: {
    type: "Thing",
    name: "Natural wine",
  },
};
