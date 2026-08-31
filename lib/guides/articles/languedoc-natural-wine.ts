import type { GuideArticleContent } from "@/lib/guides/guide-types";

/**
 * Merged Languedoc regional + natural-wine guide.
 * Replaces legacy `/languedoc` and `/languedoc/naturvin` (301 → this article).
 */
export const languedocNaturalWineArticle: GuideArticleContent = {
  slug: {
    en: "languedoc-natural-wine",
    sv: "naturvin-languedoc",
  },
  title: {
    en: "Languedoc natural wine — France's most dynamic wine region | PACT Wines",
    sv: "Naturvin från Languedoc — Frankrikes mest spännande vinregion | PACT Wines",
  },
  meta: {
    en: "Languedoc-Roussillon is France's largest wine region and a hub for natural wine. Appellation, grapes, terroir and the producers behind direct import to Stockholm.",
    sv: "Languedoc-Roussillon är Frankrikes största vinregion och ett nav för naturvin. Appellationer, druvor, terroir och producenterna bakom direktimport till Stockholm.",
  },
  h1: {
    en: "Languedoc natural wine — France's most dynamic wine region",
    sv: "Naturvin från Languedoc — Frankrikes mest spännande vinregion",
  },
  lede: {
    en: "Languedoc-Roussillon stretches along the Mediterranean from the Rhône delta to the Spanish border. With roughly 240,000 hectares of vineyard it is France's largest wine region — and one of Europe's most dynamic for organic and natural wine. Sun, wind and old stone soils produce wines with clear character, often at prices that undercut classic regions.",
    sv: "Languedoc-Roussillon sträcker sig längs Medelhavskusten från Rhônedeltat till den spanska gränsen. Med runt 240 000 hektar vingårdar är det Frankrikes största vinregion — och en av Europas mest dynamiska när det gäller ekologiskt odlat och naturligt vin. Här möts sol, vind och gamla stenjordar som ger viner med tydlig karaktär till ett pris som ofta slår klassiska regioner.",
  },
  breadcrumbShort: {
    en: "Languedoc Natural Wine",
    sv: "Naturvin Languedoc",
  },
  furtherReadingHeading: {
    en: "Further reading",
    sv: "Vidare läsning",
  },
  hubCard: {
    title: {
      en: "Languedoc natural wine — the complete guide",
      sv: "Naturvin från Languedoc — den kompletta guiden",
    },
    description: {
      en: "Appellations, grapes, terroir and the natural-wine producers PACT imports from Saint-Chinian, Faugères and beyond.",
      sv: "Appellationer, druvor, terroir och naturvinsproducenterna PACT importerar från Saint-Chinian, Faugères och grannskapen.",
    },
  },
  sections: [
    {
      heading: {
        en: "Where is Languedoc?",
        sv: "Var ligger Languedoc?",
      },
      body: {
        en: [
          "The region covers the departments along southern France's coast — from Aude and Hérault to Gard and Pyrénées-Orientales. Inland, low hills, garrigue and limestone dominate. Proximity to the Mediterranean brings hot summers and mild winters, moderated by northern winds such as the tramontane and mistral that keep vineyards dry and reduce disease pressure.",
          "Key facts at a glance: about 240,000 ha of vineyard, Mediterranean climate, and a core of Grenache, Syrah and Carignan. Appellations drinkers meet again and again include Saint-Chinian and Faugères. The house style for many small domaines is natural or organic wine built on terroir rather than heavy cellar makeup.",
        ],
        sv: [
          "Regionen omfattar departementen längs södra Frankrikes kust — från Aude och Hérault till Gard och Pyrénées-Orientales. Inland dominerar låga kullar, garrigue och kalksten. Närheten till Medelhavet ger varma somrar och milda vintrar, medaljerade av norra vindar som tramontane och mistral som håller vingårdarna friska och minskar risken för sjukdomar.",
          "I korthet: cirka 240 000 ha vingård, medelhavsklimat och en ryggrad av Grenache, Syrah och [Carignan](/vin/carignan). Appellationer som återkommer ofta är Saint-Chinian och Faugères. Stilen hos många små producenter är naturvin och ekologiskt arbete med tydlig platskaraktär.",
        ],
      },
    },
    {
      heading: {
        en: "Appellations worth knowing",
        sv: "Appellationer att känna till",
      },
      body: {
        en: [
          "Languedoc has both broad IGP labels and stricter AOPs. Saint-Chinian and Faugères in the north are known for structured reds from schist and limestone. Minervois, Corbières and Fitou range from rustic Carignan-led wines to elegant Grenache–Syrah blends. Pic Saint-Loup and La Clape near the coast give mineral whites and fresh rosés.",
          "For natural-wine drinkers, the smaller, grower-driven appellations are usually the most interesting — places where a handful of domaines set the tone rather than volume cooperatives.",
          "Saint-Chinian often balances dark fruit with fresh acidity, typically from Grenache and Syrah on limestone and clay. Faugères, on schist, tends toward more mineral, concentrated wines — useful when you want site character ahead of sheer ripeness. Many domaines work across both AOPs and experiment with maceration length and élevage.",
        ],
        sv: [
          "Languedoc har både breda IGP-etiketter och mer strikta AOP:er. Saint-Chinian och Faugères i norr är kända för strukturerade [röda](/vin/rott-naturvin) från schist och kalksten. Minervois, Corbières och Fitou erbjuder allt från rustika [carignan](/vin/carignan)-dominanta viner till eleganta grenache-syrah-blandningar. Pic Saint-Loup och La Clape vid kusten ger mineraliska [vita](/vin/vitt-naturvin) och friska roséer.",
          "För naturvin-entusiaster är just dessa mindre, producentdrivna appellationer ofta mest intressanta.",
          "Saint-Chinian erbjuder röda viner med balans mellan mörk frukt och frisk syra, ofta från grenache och syrah på kalk och lera. Faugères, med sitt skifferunderlag, ger mer mineraliska och koncentrerade viner — idealiska för dem som söker terroir framför volym. Många producenter arbetar i båda appellationerna och experimenterar med macerationstider och äldringsmetoder.",
        ],
      },
    },
    {
      heading: {
        en: "Grapes and styles",
        sv: "Druvor och stilar",
      },
      body: {
        en: [
          "Reds dominate. Grenache, Syrah, Carignan and Mourvèdre form the backbone; Cinsault often softens blends. Old-vine Carignan brings depth and acidity; Grenache adds red fruit and alcohol; Syrah brings spice and structure.",
          "Whites are often built on Grenache Blanc, Roussanne, Marsanne and Vermentino (Rolle), with Chardonnay and local Terret in the mix. Orange wine and skin-contact whites have a strong foothold here — especially among independent growers working with extended maceration and spontaneous fermentation.",
        ],
        sv: [
          "Röda viner dominerar, med [grenache](/vin/grenache), [syrah](/vin/syrah), [carignan](/vin/carignan) och mourvèdre som ryggraden — ofta med cinsault i blandningar. Carignan från gamla stockar ger djup och syra; grenache bidrar med röd frukt och alkohol; syrah tillför krydda och struktur.",
          "Vita viner byggs ofta på [grenache blanc](/vin/grenache-blanc), roussanne, marsanne och vermentino, med chardonnay och lokal terret i mixen. [Orangevin](/vin/orange-naturvin) och macererade vita har stark förankring här — särskilt bland oberoende producenter som experimenterar med skinkontakt och spontanjäsning.",
        ],
      },
    },
    {
      heading: {
        en: "Terroir and climate",
        sv: "Terroir och klimat",
      },
      body: {
        en: [
          "Soils vary sharply: schist in Faugères and Saint-Chinian, limestone in Minervois, gravel near the coast and volcanic touches around Pic Saint-Loup. That range gives wines a clear sense of place despite the region's size.",
          "The warm climate rewards skilled farming — low yields, bush vines and early-morning harvests are common strategies for keeping freshness where the sun is generous.",
        ],
        sv: [
          "Jordmån varierar kraftigt: skiffer (schist) i Faugères och Saint-Chinian, kalksten i Minervois, grus nära kusten och vulkaniska inslag runt Pic Saint-Loup. Det ger vinerna tydlig platskaraktär trots regionens storlek.",
          "Det varma klimatet kräver skickliga vinbönder — låga skördar, bush vines och skörd tidigt på morgonen är vanliga strategier för att bevara friskhet i ett landskap där solen är generös.",
        ],
      },
    },
    {
      heading: {
        en: "Natural wine in Languedoc",
        sv: "Naturvin i Languedoc",
      },
      body: {
        en: [
          "Languedoc has become a hub for France's natural-wine movement. Low yields, organic farming without chemical pesticides, spontaneous fermentation and minimal filtration are standard at many small domaines. The old cooperative and bulk-wine tradition is giving way to craft growers who export directly — the model PACT is built on: vineyard to Stockholm without unnecessary middlemen.",
          "In the glass that means honest farming and clear origin. Fruit is picked by hand or selectively, ferments on wild yeast and is often bottled without fining or filtration. The range runs from fresh, easy-drinking reds to structured schist wines from Faugères — always with the grower's fingerprint in the glass.",
          "Ten producers from Languedoc and Roussillon appear on our list of the [world's 100 best natural wine producers](/guides/worlds-best-natural-wine-producers).",
        ],
        sv: [
          "Languedoc har blivit ett nav för Frankrikes naturvinsrörelse. Låga skördar, ekologisk odling utan kemiska bekämpningsmedel, spontanjäsning och minimal filtrering är standard hos många små producenter. Regionens tradition av kooperativ och bulkvin håller på att ersättas av hantverksproducenter som exporterar direkt — precis den modell PACT bygger på: från vingård till Stockholm utan onödiga mellanhänder.",
          "I glaset handlar det om ärligt jordbruk och tydligt ursprung. Druvor skördas för hand eller selektivt, jäser med vildjäst och buteljeras ofta utan klarificering eller filtrering. Resultatet kan variera från friska, lättdruckna [röda](/vin/rott-naturvin) till strukturerade viner med skiffer-mineralitet från Faugères — alltid med producentens avtryck i glaset.",
          "Tio producenter från Languedoc och Roussillon finns med på vår lista över [världens 100 bästa naturvinsproducenter](/guider/varldens-basta-naturvinsproducenter).",
        ],
      },
    },
    {
      heading: {
        en: "Producers from Languedoc",
        sv: "Producenter från Languedoc",
      },
      body: {
        en: [
          "PACT works with domaines across Saint-Chinian, Faugères, Pic Saint-Loup, Minervois and neighbouring pockets — small estates that farm organically, ferment with indigenous yeasts and bottle without additives.",
          "Château del Ranq (Pic Saint-Loup, Hérault): Laure and Sébastien work limestone slopes at altitude — freshness, salinity and mineral wines from AOP Pic Saint-Loup to experimental Vin de France cuvées.",
          "Clos Fantine (Cabrerolles, Faugères): Carole, Corine and Olivier Andrieu farm about 25 hectares organically since the 1990s. Carignan dominates; some vines are a century old. No additives, no sulphites.",
          "Clos Gisone (Montblanc, Hérault): Corinne Gisone founded the domaine in 2022 on 4.5 hectares across three parcels — all hand work, indigenous yeasts, no additives.",
          "David Behar (Saint-Chinian): a micro-domaine on Syrah and Cinsault — no additives, no sulphites.",
          "Domaine de la Cessière (Aigues-Vives, Minervois): Antoine Cauchy farms just over three hectares with no mechanisation — old Carignan in the Cessière valley, Muscat on the causse, and rare old Lledoner Pelut.",
          "Domaine Les Serrals (Faugères): Chloé Barthet and Frédéric Almazor settled on five hectares of schist hills in 2016 — no synthetic products, no additives.",
          "Meet the full roster on our [producers](/producers) page, or shop [natural wine from Languedoc](/wine/natural-wine-languedoc).",
        ],
        sv: [
          "PACT arbetar med domäner i Saint-Chinian, Faugères, Pic Saint-Loup, Minervois och grannskap — små gårdar som odlar ekologiskt, jäser med indigena jästsvampar och buteljerar utan tillsatser.",
          "Château del Ranq (Pic Saint-Loup, Hérault): Laure och Sébastien arbetar kalkrika höjdlägen — friskhet, salinitet och mineralitet från AOP Pic Saint-Loup till experimentella Vin de France-cuvéer.",
          "Clos Fantine (Cabrerolles, Faugères): Carole, Corine och Olivier Andrieu driver cirka 25 hektar ekologiskt sedan 1990-talet. Carignan dominerar; vissa stockar är hundra år. Inga tillsatser, inga sulfiter.",
          "Clos Gisone (Montblanc, Hérault): Corinne Gisone grundade domänen 2022 på 4,5 hektar över tre parceller — allt handarbete, indigena jästsvampar, inga tillsatser.",
          "David Behar (Saint-Chinian): ett mikrodomaine på Syrah och Cinsault — inga tillsatser, inga sulfiter.",
          "Domaine de la Cessière (Aigues-Vives, Minervois): Antoine Cauchy brukar drygt tre hektar utan mekanisering — gammal Carignan i Cessière-dalen, Muscat på causse och sällsynt gammal Lledoner Pelut.",
          "Domaine Les Serrals (Faugères): Chloé Barthet och Frédéric Almazor slog sig ner på fem hektar skifferkullar 2016 — inga syntetiska produkter, inga tillsatser.",
          "Se hela listan under [producenter](/producenter), eller handla [naturvin från Languedoc](/vin/naturvin-languedoc).",
        ],
      },
    },
    {
      heading: {
        en: "Buy direct via PACT",
        sv: "Köp direkt via PACT",
      },
      body: {
        en: [
          "We pool orders onto shared pallets from southern France. When a pallet fills, the wine ships straight to Stockholm — without Systembolaget assortment stock and without unnecessary mark-ups. You see who made the wine, where it grew and what it costs. Often 15–30% below comparable Swedish prices.",
          "Browse [natural wine from Languedoc](/wine/natural-wine-languedoc) in the shop, or start from [all wines](/wine).",
        ],
        sv: [
          "Vi samlar beställningar till gemensamma pallar från södra Frankrike. När en pall fylls skickas vinet direkt till Stockholm — utan Systembolagets sortimentslager och utan onödiga påslag. Du ser vem som gör vinet, var det odlas och vad det kostar. Ofta 15–30 % under jämförbara priser i Sverige.",
          "Utforska [naturvin från Languedoc](/vin/naturvin-languedoc) i butiken, eller börja från [alla viner](/vin).",
        ],
      },
    },
  ],
  internalLinks: [
    {
      label: {
        en: "What is natural wine? →",
        sv: "Vad är naturvin? →",
      },
      href: {
        en: "/guides/what-is-natural-wine",
        sv: "/guider/vad-ar-naturvin",
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
        en: "The world's 100 best natural wines →",
        sv: "Världens 100 bästa naturviner →",
      },
      href: {
        en: "/guides/worlds-best-natural-wines",
        sv: "/guider/varldens-basta-naturviner",
      },
    },
    {
      label: {
        en: "Jura natural wine →",
        sv: "Jura naturvin →",
      },
      href: {
        en: "/guides/jura-natural-wine",
        sv: "/guider/jura-natural-wine",
      },
    },
    {
      label: {
        en: "Beaujolais natural wine →",
        sv: "Beaujolais naturvin →",
      },
      href: {
        en: "/guides/beaujolais-natural-wine",
        sv: "/guider/beaujolais-natural-wine",
      },
    },
    {
      label: {
        en: "Shop natural wine from Languedoc →",
        sv: "Köp naturvin från Languedoc →",
      },
      href: {
        en: "/wine/natural-wine-languedoc",
        sv: "/vin/naturvin-languedoc",
      },
    },
  ],
  jsonLdAbout: {
    type: "Place",
    name: "Languedoc",
  },
};
