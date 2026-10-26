/** ISO date for Article datePublished/dateModified and the visible updated line. */
export const TOP_100_WINES_PUBLISHED_AT = "2026-10-01";
export const TOP_100_WINES_UPDATED_AT = "2026-10-26";

export interface TopWine {
  rank: number;
  wine: string;
  /** Display name rendered on guide pages - do not change for linking. */
  producer: string;
  /**
   * Exact TopProducer.name for linking to TOP_100_PRODUCERS.
   * Must match TopProducer.name exactly; omit when the producer is not in the top 100.
   */
  topProducerName?: string;
  region: string;
  country: string;
  type: string;
  grapes: string;
  description?: string;
  descriptionEn?: string;
}

export const TOP_100_WINES: TopWine[] = [
  {
    rank: 1,
    wine: "Arbois-Pupillin Savagnin",
    producer: "Pierre Overnoy / Emmanuel Houillon",
    topProducerName: "Pierre Overnoy / Emmanuel Houillon",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Savagnin",
    description:
      "Det här är flaskan som gjorde naturvin till något mer än en idé. Overnoys Savagnin vinifieras ouillé — fatet fylls på så att inget jästtäcke bildas — vilket bryter mot Juras hela tradition. Utan tillsatt svavel och utan skyddande voile borde vinet ha oxiderat inom några år. Istället åldras det i decennier och har blivit måttstocken för hela rörelsen.",
    descriptionEn:
      "This is the bottle that made natural wine more than an idea. Overnoy's Savagnin is vinified ouillé — the barrel topped up so no veil of yeast forms — which breaks with the whole Jura tradition. Without added sulphur and without a protective voile the wine should have oxidised within a few years. Instead it ages for decades and has become the benchmark for the entire movement.",
  },
  {
    rank: 2,
    wine: "Cornas Chaillot",
    producer: "Thierry Allemand",
    topProducerName: "Thierry Allemand",
    region: "Cornas, Rhône",
    country: "Frankrike",
    type: "Rött",
    grapes: "Syrah",
    description:
      "Chaillot kommer från yngre stockar än Allemands andra cuvée men är på inget sätt ett andravin. Terrasserna av granit ger en Syrah med svartpeppar, violer och en salt mineralitet under frukten. Vinet är strukturerat och lagringsbart utan att någonsin bli tungt.",
    descriptionEn:
      "Chaillot comes from younger vines than Allemand's other cuvée but is in no sense a second wine. The granite terraces give a Syrah with black pepper, violets and a saline minerality beneath the fruit. The wine is structured and age-worthy without ever becoming heavy.",
  },
  {
    rank: 3,
    wine: "Ribolla Gialla Anfora",
    producer: "Gravner",
    topProducerName: "Joško Gravner",
    region: "Friuli Collio",
    country: "Italien",
    type: "Orange",
    grapes: "Ribolla Gialla",
    description:
      "Efter Gravners resa till Georgien 1997 började han vinifiera i qvevri nedgrävda i källargolvet. Ribolla Gialla får månader av skalkontakt utan temperaturkontroll och lagras därefter i stora fat i flera år innan release. Resultatet är bärnstensfärgat, tanninrikt och närmast te-liknande i aromatiken.",
    descriptionEn:
      "After Gravner's 1997 trip to Georgia he began vinifying in qvevri buried in the cellar floor. Ribolla Gialla gets months of skin contact without temperature control and is then aged in large casks for several years before release. The result is amber, tannic and almost tea-like in its aromatics.",
  },
  {
    rank: 4,
    wine: "Les Chalasses Vieilles Vignes",
    producer: "Jean-François Ganevat",
    topProducerName: "Jean-François Ganevat",
    region: "Côtes du Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chardonnay",
    description:
      "Från gamla stockar på märgeljord i Rotalier, planterade av Ganevats farfar. Vinet är vinifierat ouillé med lång elevage och har den kombination av spänst och djup som gjort Ganevat till en av naturvinets mest jagade producenter.",
    descriptionEn:
      "From old vines on marl soil in Rotalier, planted by Ganevat's grandfather. The wine is vinified ouillé with long élevage and has the combination of tension and depth that has made Ganevat one of natural wine's most hunted producers.",
  },
  {
    rank: 5,
    wine: "Substance",
    producer: "Jacques Selosse",
    topProducerName: "Jacques Selosse",
    region: "Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Chardonnay",
    description:
      "Substance görs i ett solera-system som Anselme Selosse startade 1986 och som därför innehåller vin från varje årgång sedan dess. Chardonnay från Avize, fatjäst och oxidativt behandlad, ger en champagne som mer liknar en sherry i sin komplexitet än en traditionell brut.",
    descriptionEn:
      "Substance is made in a solera system Anselme Selosse started in 1986, which means it contains wine from every vintage since. Chardonnay from Avize, barrel-fermented and oxidatively handled, gives a champagne closer to sherry in its complexity than to a traditional brut.",
  },
  {
    rank: 6,
    wine: "Rkatsiteli",
    producer: "Pheasant's Tears",
    topProducerName: "Pheasant's Tears",
    region: "Kakheti, Georgien",
    country: "Georgien",
    type: "Orange",
    grapes: "Rkatsiteli",
    description:
      "Rkatsiteli är Georgiens mest odlade vita druva och här vinifieras den precis som den gjorts i åtta tusen år: hela klasar med skal och skaft i qvevri nedgrävda i marken, utan tillsatser. Vinet doftar av torkade aprikoser, valnöt och svart te.",
    descriptionEn:
      "Rkatsiteli is Georgia's most planted white grape, and here it is vinified exactly as it has been for eight thousand years: whole clusters with skins and stems in qvevri buried in the ground, without additives. The wine smells of dried apricot, walnut and black tea.",
  },
  {
    rank: 7,
    wine: "Cornas Reynard",
    producer: "Thierry Allemand",
    topProducerName: "Thierry Allemand",
    region: "Cornas, Rhône",
    country: "Frankrike",
    type: "Rött",
    grapes: "Syrah",
    description:
      "Reynard kommer från Allemands äldsta stockar på de branta granitterrasserna och är hans mest strukturerade vin. Där Chaillot är omedelbar är Reynard sluten i ungdomen och kräver år. Med tid utvecklas den mot rök, oliv, blod och violer.",
    descriptionEn:
      "Reynard comes from Allemand's oldest vines on the steep granite terraces and is his most structured wine. Where Chaillot is immediate, Reynard is closed in youth and demands years. With time it develops towards smoke, olive, blood and violets.",
  },
  {
    rank: 8,
    wine: "Entre Deux Bleus",
    producer: "Domaine des Miroirs / Kenjiro Kagami",
    topProducerName: "Domaine des Miroirs / Kenjiro Kagami",
    region: "Côtes du Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Savagnin",
    description:
      "Kagamis viner produceras i så små volymer att de knappt når marknaden. Entre Deux Bleus är hans mest omtalade cuvée — ett vitt Jura-vin med en klarhet och spänst som får de flesta jämförelser att kännas otillräckliga.",
    descriptionEn:
      "Kagami's wines are produced in such small volumes that they barely reach the market. Entre Deux Bleus is his most talked-about cuvée — a white Jura wine with a clarity and tension that makes most comparisons feel inadequate.",
  },
  {
    rank: 9,
    wine: "Oslavje",
    producer: "Radikon",
    topProducerName: "Radikon",
    region: "Friuli Collio",
    country: "Italien",
    type: "Orange",
    grapes: "Chardonnay, Sauvignon, Pinot Grigio",
    description:
      "Oslavje är en blandning av Chardonnay, Sauvignon och Pinot Grigio med lång skalkontakt i stora slavonska fat, utan tillsatt svavel och utan filtrering. Vinet är djupt bärnstensfärgat med tanniner som ett rött vin.",
    descriptionEn:
      "Oslavje is a blend of Chardonnay, Sauvignon and Pinot Grigio with long skin contact in large Slavonian casks, without added sulphur and without filtration. The wine is deeply amber with tannins like a red wine.",
  },
  {
    rank: 10,
    wine: "Clos Rougeard Le Bourg",
    producer: "Clos Rougeard (Foucault)",
    topProducerName: "Clos Rougeard (Foucault)",
    region: "Saumur-Champigny, Loire",
    country: "Frankrike",
    type: "Rött",
    grapes: "Cabernet Franc",
    description:
      "Le Bourg kommer från en liten parcell med gamla stockar och lagras i nya fat — ovanligt för naturvin, men bröderna Foucault följde aldrig någons regler utom sina egna. Vinet visade världen att Cabernet Franc från Loire kunde stå bredvid de största vinerna från Bordeaux och Bourgogne.",
    descriptionEn:
      "Le Bourg comes from a small parcel of old vines and is aged in new barrels — unusual for natural wine, but the Foucault brothers never followed anyone's rules but their own. The wine showed the world that Cabernet Franc from the Loire could stand beside the greatest wines of Bordeaux and Burgundy.",
  },
  {
    rank: 11,
    wine: "Arbois-Pupillin Chardonnay",
    producer: "Pierre Overnoy / Emmanuel Houillon",
    topProducerName: "Pierre Overnoy / Emmanuel Houillon",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chardonnay",
    description:
      "Samma kompromisslösa metod som Savagninen men på Chardonnay. Vinet har en salt, nästan jodig mineralitet och åldras lika obegripligt länge för att vara helt utan tillsatt svavel.",
    descriptionEn:
      "The same uncompromising method as the Savagnin but on Chardonnay. The wine has a saline, almost iodine minerality and ages just as improbably long for something made entirely without added sulphur.",
  },
  {
    rank: 12,
    wine: "Morgon Côte du Py",
    producer: "Jean Foillard",
    topProducerName: "Jean Foillard",
    region: "Beaujolais",
    country: "Frankrike",
    type: "Rött",
    grapes: "Gamay",
    description:
      "Från den blå granitkullen som är Morgons bästa läge. Foillards version är djup, jordig och strukturerad — det vin som mer än något annat visade att Gamay kan vara seriöst.",
    descriptionEn:
      "From the blue granite hill that is Morgon's finest site. Foillard's version is deep, earthy and structured — the wine that more than any other showed Gamay could be serious.",
  },
  {
    rank: 13,
    wine: "Breg Anfora",
    producer: "Gravner",
    topProducerName: "Joško Gravner",
    region: "Friuli Collio",
    country: "Italien",
    type: "Orange",
    grapes: "Sauvignon, Chardonnay, Pinot Grigio, Riesling",
    description:
      "Gravners andra amforavin, en blandning av Chardonnay, Sauvignon, Pinot Grigio och Riesling Italico. Djupare och mer oxidativt än Ribollan, med en fenolisk struktur som kräver mat.",
    descriptionEn:
      "Gravner's second amphora wine, a blend of Chardonnay, Sauvignon, Pinot Grigio and Riesling Italico. Deeper and more oxidative than the Ribolla, with a phenolic structure that demands food.",
  },
  {
    rank: 14,
    wine: "Cuvée de l'Enfant Terrible",
    producer: "Jean-François Ganevat",
    topProducerName: "Jean-François Ganevat",
    region: "Côtes du Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Poulsard",
    description:
      "Ganevats mest lättillgängliga röda — bleka, doftande Poulsard med hallon, blodapelsin och en nästan genomskinlig kropp. Namnet är ett självporträtt.",
    descriptionEn:
      "Ganevat's most approachable red — pale, perfumed Poulsard with raspberry, blood orange and an almost transparent body. The name is a self-portrait.",
  },
  {
    rank: 15,
    wine: "Initial",
    producer: "Jacques Selosse",
    topProducerName: "Jacques Selosse",
    region: "Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Chardonnay",
    description:
      "Selosses instegschampagne på Chardonnay från Avize, Cramant och Oger, men \"insteg\" är missvisande. Fatjäst, oxidativ och texturrik — för många den bästa introduktionen till vad grower champagne kan vara.",
    descriptionEn:
      "Selosse's entry-level champagne from Chardonnay grown in Avize, Cramant and Oger, though entry-level is misleading. Barrel-fermented, oxidative and textured — for many the best introduction to what grower champagne can be.",
  },
  {
    rank: 16,
    wine: "Tsitska-Tsolikouri",
    producer: "Ramaz Nikoladze",
    topProducerName: "Ramaz Nikoladze",
    region: "Nakhshirgele, Imereti, Georgien",
    country: "Georgien",
    type: "Orange",
    grapes: "Tsitska, Tsolikouri",
    description:
      "Två inhemska georgiska druvor i qvevri med kortare skalkontakt än Kakheti-traditionen. Lättare och mer floral än östgeorgiska orangeviner — Imeretis egen stil.",
    descriptionEn:
      "Two indigenous Georgian grapes in qvevri with shorter skin contact than the Kakheti tradition. Lighter and more floral than eastern Georgian orange wines — Imereti's own style.",
  },
  {
    rank: 17,
    wine: "I Need the Sun",
    producer: "Domaine des Miroirs / Kenjiro Kagami",
    topProducerName: "Domaine des Miroirs / Kenjiro Kagami",
    region: "Côtes du Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chardonnay",
    description:
      "Kagamis Chardonnay, med samma spröda precision som resten av sortimentet. Namnet är ett av flera som gjort domänet lika känt för sin estetik som för sina viner.",
    descriptionEn:
      "Kagami's Chardonnay, with the same brittle precision as the rest of the range. The name is one of several that have made the domaine as known for its aesthetic as for its wines.",
  },
  {
    rank: 18,
    wine: "Jakot",
    producer: "Radikon",
    topProducerName: "Radikon",
    region: "Friuli Collio",
    country: "Italien",
    type: "Orange",
    grapes: "Tocai Friulano",
    description:
      "Namnet är Tokaj baklänges — en protest mot EU-förbudet att kalla druvan Tocai Friulano. Vinet är en av de renaste tolkningarna av Friulano med lång skalkontakt.",
    descriptionEn:
      "The name is Tokaj spelled backwards — a protest against the EU ban on calling the grape Tocai Friulano. The wine is one of the purest interpretations of Friulano with long skin contact.",
  },
  {
    rank: 19,
    wine: "Clos Rougeard Les Poyeux",
    producer: "Clos Rougeard (Foucault)",
    topProducerName: "Clos Rougeard (Foucault)",
    region: "Saumur-Champigny, Loire",
    country: "Frankrike",
    type: "Rött",
    grapes: "Cabernet Franc",
    description:
      "Den mer sensuella av Clos Rougeards två stora cuvéer. Där Le Bourg är strukturerad och sluten är Les Poyeux öppen, doftande och nästan bourgognelik i sin finess.",
    descriptionEn:
      "The more sensual of Clos Rougeard's two great cuvées. Where Le Bourg is structured and closed, Les Poyeux is open, perfumed and almost Burgundian in its finesse.",
  },
  {
    rank: 20,
    wine: "Morgon",
    producer: "Marcel Lapierre",
    topProducerName: "Marcel Lapierre",
    region: "Beaujolais",
    country: "Frankrike",
    type: "Rött",
    grapes: "Gamay",
    description:
      "Vinet som startade allt i Beaujolais. Lapierres Morgon är saftig, jordig och omedelbar — en mall som hundratals producenter försökt kopiera sedan 1980-talet.",
    descriptionEn:
      "The wine that started everything in Beaujolais. Lapierre's Morgon is juicy, earthy and immediate — a template hundreds of producers have tried to copy since the 1980s.",
  },
  {
    rank: 21,
    wine: "Arbois-Pupillin Ploussard",
    producer: "Pierre Overnoy / Emmanuel Houillon",
    topProducerName: "Pierre Overnoy / Emmanuel Houillon",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Poulsard",
    description:
      "Blek nästan till rosé, med hallon, järn och en genomskinlighet som är Juras signatur. Ett rött vin som tvingar en att omvärdera vad rött vin kan vara.",
    descriptionEn:
      "Pale almost to rosé, with raspberry, iron and a transparency that is the Jura's signature. A red wine that forces you to reconsider what red wine can be.",
  },
  {
    rank: 22,
    wine: "La Terre Rouge",
    producer: "Jean-Pierre Robinot",
    topProducerName: "Jean-Pierre Robinot",
    region: "Chahaignes, Coteaux du Loir, Loire",
    country: "Frankrike",
    type: "Rött",
    grapes: "Pineau d'Aunis",
    description:
      "Robinots tolkning av Loires mest särpräglade röda druva — pepprig, lätt och vild, gjord helt utan svavel.",
    descriptionEn:
      "Robinot's interpretation of the Loire's most distinctive red grape — peppery, light and wild, made entirely without sulphur.",
  },
  {
    rank: 23,
    wine: "Saint-Joseph Rouge",
    producer: "Dard & Ribo",
    topProducerName: "Dard & Ribo",
    region: "Saint-Joseph, Rhône",
    country: "Frankrike",
    type: "Rött",
    grapes: "Syrah",
    description:
      "Motsatsen till norra Rhônes extraherade stil: lätt, saftig, doftande och drickbar ung. Dard & Ribo visade att Syrah inte behöver vara tung för att vara stor.",
    descriptionEn:
      "The opposite of the northern Rhône's extracted style: light, juicy, perfumed and drinkable young. Dard & Ribo showed that Syrah does not need to be heavy to be great.",
  },
  {
    rank: 24,
    wine: "Magma",
    producer: "Frank Cornelissen",
    topProducerName: "Frank Cornelissen",
    region: "Contrada Barbabecchi, Etna Nord, Sicilien",
    country: "Italien",
    type: "Rött",
    grapes: "Nerello Mascalese",
    description:
      "Från de högst belägna stockarna på Etnas nordsluttning, vinifierat med minimal intervention. Ett av naturvinets mest kompromisslösa och omdiskuterade viner.",
    descriptionEn:
      "From the highest vines on Etna's northern slope, vinified with minimal intervention. One of natural wine's most uncompromising and most debated wines.",
  },
  {
    rank: 25,
    wine: "Les Grands Teppes Vieilles Vignes",
    producer: "Jean-François Ganevat",
    topProducerName: "Jean-François Ganevat",
    region: "Côtes du Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chardonnay",
    description:
      "Gamla stockar på blå märgel, vinifierat ouillé med lång elevage. Ett av de vita viner som bäst visar varför Ganevat blivit en av rörelsens mest jagade producenter.",
    descriptionEn:
      "Old vines on blue marl, vinified ouillé with long élevage. One of the white wines that best shows why Ganevat became one of the movement's most hunted producers.",
  },
  {
    rank: 26,
    wine: "Les Ursules Blanc de Noirs",
    producer: "Roses de Jeanne / Cédric Bouchard",
    topProducerName: "Cédric Bouchard / Roses de Jeanne",
    region: "Celles-sur-Ource, Aube, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Pinot Noir",
    description:
      "En parcell, en druvsort, en årgång — Bouchards princip i praktiken. Pinot Noir från Celles-sur-Ource med låg dosage och en lätthet som är helt hans egen.",
    descriptionEn:
      "One parcel, one variety, one vintage — Bouchard's principle in practice. Pinot Noir from Celles-sur-Ource with low dosage and a lightness entirely his own.",
  },
  {
    rank: 27,
    wine: "Sonorité du Vent",
    producer: "Domaine des Miroirs / Kenjiro Kagami",
    topProducerName: "Domaine des Miroirs / Kenjiro Kagami",
    region: "Côtes du Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Savagnin",
    description:
      "Kagamis Savagnin, vinifierad ouillé. Spänstig, salt och nästan spröd — och en av de svåraste flaskorna i hela naturvinsvärlden att hitta.",
    descriptionEn:
      "Kagami's Savagnin, vinified ouillé. Taut, saline and almost brittle — and one of the hardest bottles to find in the entire natural wine world.",
  },
  {
    rank: 28,
    wine: "Ribolla",
    producer: "Radikon",
    topProducerName: "Radikon",
    region: "Friuli Collio",
    country: "Italien",
    type: "Orange",
    grapes: "Ribolla Gialla",
    description:
      "Radikons rena Ribolla Gialla, med lång skalkontakt i slavonsk ek. Tillsammans med Gravners version det vin som definierade Oslavje som orangevinets huvudstad.",
    descriptionEn:
      "Radikon's pure Ribolla Gialla, with long skin contact in Slavonian oak. Together with Gravner's version, the wine that defined Oslavje as the capital of orange wine.",
  },
  {
    rank: 29,
    wine: "Coulée de Serrant",
    producer: "Nicolas Joly",
    topProducerName: "Nicolas Joly",
    region: "Savennières, Loire",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chenin Blanc",
    description:
      "En av få franska appellationer som utgörs av en enda vingård, biodynamiskt odlad av Joly sedan 1980-talet. Ett vin som delar åsikter men som ingen ignorerar.",
    descriptionEn:
      "One of few French appellations consisting of a single vineyard, farmed biodynamically by Joly since the 1980s. A wine that divides opinion but which no one ignores.",
  },
  {
    rank: 30,
    wine: "Fleurie",
    producer: "Yvon Métras",
    topProducerName: "Yvon Métras",
    region: "Beaujolais",
    country: "Frankrike",
    type: "Rött",
    grapes: "Gamay",
    description:
      "Métras arbetar med helklase och nära noll svavel. Hans Fleurie är parfymerad, genomskinlig och elektrisk — och bland de svåraste vinerna att få tag på i regionen.",
    descriptionEn:
      "Métras works with whole clusters and near-zero sulphur. His Fleurie is perfumed, transparent and electric — and among the hardest wines to find in the region.",
  },
  {
    rank: 31,
    wine: "Ploussard Point Barre",
    producer: "Philippe Bornard",
    topProducerName: "Philippe Bornard",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Poulsard",
    description:
      "Ploussard från gamla stockar på röd och grå märgel i Pupillin, med 21 dagars kolsyremaceration och lagring på stora ekfat. Bornard började göra eget vin på inrådan av Pierre Overnoy och odlar biodynamiskt, certifierat sedan 2012. Vinet säljs numera under sonen Tony Bornards namn.",
    descriptionEn:
      "Ploussard from old vines on red and grey marl in Pupillin, with 21 days of carbonic maceration and ageing in large oak barrels. Bornard began making his own wine on the advice of Pierre Overnoy and farms biodynamically, certified since 2012. The wine is now sold under his son Tony Bornard's name.",
  },
  {
    rank: 32,
    wine: "Crozes-Hermitage Rouge",
    producer: "Dard & Ribo",
    topProducerName: "Dard & Ribo",
    region: "Crozes-Hermitage, Rhône",
    country: "Frankrike",
    type: "Rött",
    grapes: "Syrah",
    description:
      "René-Jean Dard och François Ribo startade domänen i Mercurol 1984 och hörde till de första i norra Rhône som arbetade med minimalt svavel. Deras Crozes-Hermitage är Syrah gjord för friskhet och frukt snarare än extraktion.",
    descriptionEn:
      "René-Jean Dard and François Ribo started the domaine in Mercurol in 1984 and were among the first in the northern Rhône to work with minimal sulphur. Their Crozes-Hermitage is Syrah made for freshness and fruit rather than extraction.",
  },
  {
    rank: 33,
    wine: "Ageno",
    producer: "La Stoppa",
    topProducerName: "La Stoppa / Elena Pantaleoni",
    region: "Emilia-Romagna",
    country: "Italien",
    type: "Orange",
    grapes: "Malvasia, Ortrugo",
    description:
      "Malvasia di Candia Aromatica med Ortrugo och Trebbiano från Colli Piacentini, cirka fyra månader på skalen i tank, vilda jästsvampar, ett år på fat och minst två år på flaska före release. Elena Pantaleoni odlar utan kemiska medel på tung lera kring Rivergaro.",
    descriptionEn:
      "Malvasia di Candia Aromatica with Ortrugo and Trebbiano from the Colli Piacentini, about four months on the skins in tank, wild yeasts, a year in barrel and at least two years in bottle before release. Elena Pantaleoni farms without chemical inputs on heavy clay around Rivergaro.",
  },
  {
    rank: 34,
    wine: "Trousseau Les Corvées",
    producer: "Stéphane Tissot",
    topProducerName: "Bénédicte & Stéphane Tissot",
    region: "Arbois, Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Trousseau",
    description:
      "Trousseau från Stéphane Tissot i Montigny-lès-Arsures utanför Arbois. Domänens 43 hektar är certifierat ekologiska och biodynamiska, jäsningen sker med vilda jästsvampar och svavel hålls till ett minimum.",
    descriptionEn:
      "Trousseau from Stéphane Tissot in Montigny-lès-Arsures outside Arbois. The domaine's 43 hectares are certified organic and biodynamic, fermentation uses wild yeasts and sulphur is kept to a minimum.",
  },
  {
    rank: 35,
    wine: "La Haute-Lemblé Blanc de Blancs",
    producer: "Roses de Jeanne / Cédric Bouchard",
    topProducerName: "Cédric Bouchard / Roses de Jeanne",
    region: "Celles-sur-Ource, Aube, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Chardonnay",
    description:
      "Cédric Bouchard i Celles-sur-Ource gör champagne efter principen en druva, en parcell, en årgång. La Haute-Lemblé är ren Chardonnay från en enda parcell i Aube.",
    descriptionEn:
      "Cédric Bouchard in Celles-sur-Ource makes champagne on the principle of one grape, one parcel, one vintage. La Haute-Lemblé is pure Chardonnay from a single parcel in the Aube.",
  },
  {
    rank: 36,
    wine: "Châteauneuf-du-Pape Rouge",
    producer: "Château Rayas",
    topProducerName: "Château Rayas",
    region: "Châteauneuf-du-Pape, Rhône",
    country: "Frankrike",
    type: "Rött",
    grapes: "Grenache",
    description:
      "Ren Grenache från sandjord, gjord av Emmanuel Reynaud på ett traditionellt sätt som skiljer sig från resten av appellationen. Rayas kallar sig inte naturvin, men står på listan för sin hållning till minimal intervention i källaren.",
    descriptionEn:
      "Pure Grenache from sandy soils, made by Emmanuel Reynaud in a traditional way that sets it apart from the rest of the appellation. Rayas does not call itself natural wine, but is on the list for its approach of minimal intervention in the cellar.",
  },
  {
    rank: 37,
    wine: "Château-Chalon",
    producer: "Jean Macle",
    topProducerName: "Jean Macle",
    region: "Château-Chalon, Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Savagnin",
    description:
      "Vin jaune på Savagnin från Château-Chalon, lagrat under jästhinna i minst sex år utan påfyllning och buteljerat i den traditionella 62 cl-flaskan clavelin. Macle är en av appellationens referensproducenter.",
    descriptionEn:
      "Vin jaune from Savagnin in Château-Chalon, aged under a veil of yeast for at least six years without topping up and bottled in the traditional 62 cl clavelin. Macle is one of the appellation's reference producers.",
  },
  {
    rank: 38,
    wine: "Morgon 3.14",
    producer: "Jean Foillard",
    topProducerName: "Jean Foillard",
    region: "Beaujolais",
    country: "Frankrike",
    type: "Rött",
    grapes: "Gamay",
    description:
      "Foillards cuvée från domänens äldsta stockar i en enskild parcell på Côte du Py i Morgon, på granitjord. Handplockat, vilda jästsvampar, lång och varsam maceration, lagrat i ståltank och med lite eller inget svavel.",
    descriptionEn:
      "Foillard's cuvée from the domaine's oldest vines in a single parcel on the Côte du Py in Morgon, on granite. Hand-harvested, wild yeasts, long and gentle maceration, aged in stainless steel and with little or no sulphur.",
  },
  {
    rank: 39,
    wine: "Trebbiano d'Abruzzo",
    producer: "Valentini",
    topProducerName: "Valentini",
    region: "Abruzzo",
    country: "Italien",
    type: "Vitt",
    grapes: "Trebbiano d'Abruzzo",
    description:
      "Edoardo Valentini byggde en av Italiens mest eftertraktade vitviner på en druva som annars förknippas med enkla viner. Familjen buteljerar bara en liten del av skörden och säljer resten vidare. Sonen Francesco Paolo driver domänen sedan Edoardos död 2006.",
    descriptionEn:
      "Edoardo Valentini built one of Italy's most sought-after white wines on a grape otherwise associated with simple wines. The family bottles only a small part of the harvest and sells the rest on. His son Francesco Paolo has run the domaine since Edoardo's death in 2006.",
  },
  {
    rank: 40,
    wine: "Saint-Joseph Sainte-Épine",
    producer: "Hervé Souhaut / Romaneaux-Destezet",
    topProducerName: "Hervé Souhaut / Romaneaux-Destezet",
    region: "Saint-Jean-de-Muzols, Saint-Joseph, Rhône",
    country: "Frankrike",
    type: "Rött",
    grapes: "Syrah",
    description:
      "Syrah från hundraåriga stockar på granit i Saint-Joseph, mittemot Hermitage-kullen. Jäst med hela klasar, lång maceration vid låg temperatur och ett år på fin jästfällning i trä, utan tillsatser.",
    descriptionEn:
      "Syrah from century-old vines on granite in Saint-Joseph, across from the Hermitage hill. Fermented with whole clusters, long maceration at low temperature and a year on fine lees in wood, without additives.",
  },
  {
    rank: 41,
    wine: "Le Clos de la Tour de Curon",
    producer: "Bénédicte & Stéphane Tissot",
    topProducerName: "Bénédicte & Stéphane Tissot",
    region: "Arbois, Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chardonnay",
    description:
      "Chardonnay från en inmurad vingård på märgel som Stéphane Tissot planterat om med mycket tät plantering och bearbetar med häst. Vinet fylls på i fat, vilket ger en frisk och precis stil snarare än oxidativ. Domänen är biodynamiskt certifierad sedan 2004.",
    descriptionEn:
      "Chardonnay from a walled vineyard on marl that Stéphane Tissot replanted at very high density and works by horse. The wine is topped up in barrel, which gives a fresh and precise style rather than an oxidative one. The domaine has been certified biodynamic since 2004.",
  },
  {
    rank: 42,
    wine: "Macchiona",
    producer: "La Stoppa",
    topProducerName: "La Stoppa / Elena Pantaleoni",
    region: "Emilia-Romagna",
    country: "Italien",
    type: "Rött",
    grapes: "Barbera, Bonarda",
    description:
      "Hälften Barbera och hälften Bonarda från La Stoppas äldsta stockar på tung lera. Jäst med vilda jästsvampar utan svavel, cirka 40 dagars maceration, flera år på stora slavonska ekfat och sedan flera år till på flaska innan vinet släpps. Ofiltrerat.",
    descriptionEn:
      "Half Barbera and half Bonarda from La Stoppa's oldest vines on heavy clay. Fermented with wild yeasts without sulphur, about 40 days of maceration, several years in large Slavonian oak casks and then several more years in bottle before release. Unfiltered.",
  },
  {
    rank: 43,
    wine: "MunJebel Rosso",
    producer: "Cornelissen",
    topProducerName: "Frank Cornelissen",
    region: "Etna, Sicilien",
    country: "Italien",
    type: "Rött",
    grapes: "Nerello Mascalese",
    description:
      "Namnet kombinerar latinets mons och arabiskans jebel, båda betyder berg, och syftar på Etna. Cornelissen gör MunJebel Rosso på Nerello Mascalese från enskilda contrade på vulkanisk jord, med lång skalkontakt och lagring i neutrala tankar i stället för trä.",
    descriptionEn:
      "The name combines the Latin mons and the Arabic jebel, both meaning mountain, and refers to Etna. Cornelissen makes MunJebel Rosso from Nerello Mascalese from single contrade on volcanic soils, with long skin contact and ageing in neutral tanks instead of wood.",
  },
  {
    rank: 44,
    wine: "Cuvée du Goulté",
    producer: "Marie-Noëlle Ledru",
    topProducerName: "Marie-Noëlle Ledru",
    region: "Ambonnay Grand Cru, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Pinot Noir",
    description:
      "Blanc de noirs på Pinot Noir från Ledrus bästa parceller mitt i sluttningen i Ambonnay Grand Cru, ekologiskt odlat. Goulté betyder på lokal dialekt den första och finaste musten från pressen. Det är Ledrus toppcuvée och görs i små mängder.",
    descriptionEn:
      "Blanc de noirs from Pinot Noir from Ledru's best mid-slope parcels in Ambonnay Grand Cru, organically farmed. Goulté is local dialect for the first and finest juice from the press. It is Ledru's top cuvée and made in small quantities.",
  },
  {
    rank: 45,
    wine: "Montepulciano d'Abruzzo",
    producer: "Valentini",
    topProducerName: "Valentini",
    region: "Abruzzo",
    country: "Italien",
    type: "Rött",
    grapes: "Montepulciano",
    description:
      "Valentinis röda följer samma princip som Trebbiano: familjen buteljerar bara det de anser hålla måttet och säljer resten vidare. Montepulciano från Loreto Aprutino, ett av de vin som visar hur långt druvan kan nå när den inte görs för volym.",
    descriptionEn:
      "Valentini's red follows the same principle as the Trebbiano: the family bottles only what they consider good enough and sells the rest on. Montepulciano from Loreto Aprutino, one of the wines that shows how far the grape can go when it is not made for volume.",
  },
  {
    rank: 46,
    wine: "Vouvray Pétillant Brut",
    producer: "Domaine Huet",
    topProducerName: "Domaine Huet",
    region: "Vouvray, Loire",
    country: "Frankrike",
    type: "Mousserande",
    grapes: "Chenin Blanc",
    description:
      "Chenin Blanc från Vouvray, lagrat minst tre år på flaska i domänens tuffkällare innan det släpps. Noël Pinguet började ställa om domänens 30 hektar till biodynamisk odling efter ett försök 1988.",
    descriptionEn:
      "Chenin Blanc from Vouvray, aged at least three years in bottle in the domaine's tuffeau cellars before release. Noël Pinguet began converting the domaine's 30 hectares to biodynamic farming after a trial in 1988.",
  },
  {
    rank: 47,
    wine: "La Closerie Les Béguines",
    producer: "Jérôme Prévost / La Closerie",
    topProducerName: "Jérôme Prévost / La Closerie",
    region: "Gueux, Montagne de Reims, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Pinot Meunier, Chardonnay, Pinot Noir, Pinot Blanc",
    description:
      "Nästan ren Meunier från en enda parcell på 2,2 hektar i Gueux, med stockar planterade på 1960-talet och ärvda från Prévosts mormor. Ekologiskt odlat, jorden bearbetas med häst, inga tillsatser, tio månader på stora begagnade fat och ofiltrerat.",
    descriptionEn:
      "Almost pure Meunier from a single 2.2-hectare parcel in Gueux, with vines planted in the 1960s and inherited from Prévost's grandmother. Organically farmed, soils worked by horse, no additions, ten months in large used barrels and unfiltered.",
  },
  {
    rank: 48,
    wine: "Viognier Romaneaux-Destezet",
    producer: "Hervé Souhaut",
    topProducerName: "Hervé Souhaut / Romaneaux-Destezet",
    region: "Ardèche",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Viognier, Roussanne",
    description:
      "Hervé Souhaut grundade domänen 1993 i Arlebosc i norra Ardèche och odlar cirka fem hektar gamla stockar på granit. Den vita Romaneaux-Destezet är Viognier med en del Roussanne, direktpressad, lagrad på fin jästfällning och buteljerad ofiltrerad.",
    descriptionEn:
      "Hervé Souhaut founded the domaine in 1993 in Arlebosc in the northern Ardèche and farms about five hectares of old vines on granite. The white Romaneaux-Destezet is Viognier with some Roussanne, directly pressed, aged on fine lees and bottled unfiltered.",
  },
  {
    rank: 49,
    wine: "Morgon Vieilles Vignes",
    producer: "Guy Breton",
    topProducerName: "Guy Breton",
    region: "Beaujolais",
    country: "Frankrike",
    type: "Rött",
    grapes: "Gamay",
    description:
      "Guy Breton är en av de fyra Morgon-producenter, tillsammans med Marcel Lapierre, Jean Foillard och Jean-Paul Thévenet, som under Jules Chauvets inflytande lade grunden för naturvinsrörelsen i Beaujolais. Vieilles Vignes är Gamay från hans äldsta stockar.",
    descriptionEn:
      "Guy Breton is one of the four Morgon producers, together with Marcel Lapierre, Jean Foillard and Jean-Paul Thévenet, who under the influence of Jules Chauvet laid the foundation for the natural wine movement in Beaujolais. Vieilles Vignes is Gamay from his oldest vines.",
  },
  {
    rank: 50,
    wine: "Sagrantino di Montefalco",
    producer: "Paolo Bea",
    topProducerName: "Paolo Bea",
    region: "Umbria",
    country: "Italien",
    type: "Rött",
    grapes: "Sagrantino",
    description:
      "Familjen Bea finns dokumenterad i Montefalco sedan år 1500. Sagrantino står för omkring 60 procent av deras fem hektar vingård, som odlas ekologiskt och handplockas. Vinerna buteljeras utan klarning eller filtrering.",
    descriptionEn:
      "The Bea family has been documented in Montefalco since 1500. Sagrantino makes up around 60 percent of their five hectares of vineyard, which is farmed organically and hand-harvested. The wines are bottled without fining or filtration.",
  },
  {
    rank: 51,
    wine: "Les Vieilles Vignes des Blanderies",
    producer: "Mark Angeli / Ferme de la Sansonnière",
    topProducerName: "Mark Angeli / Ferme de la Sansonnière",
    region: "Thouarcé, Anjou, Loire",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chenin Blanc",
    description:
      "Mark Angeli köpte gården i Anjou 1990 och har odlat biodynamiskt sedan starten. Blanderies är Chenin Blanc från en enskild vingård, gjord i mycket små mängder och lagrad länge på gamla ekfat. Efter upprepade avslag från INAO:s provningspanel lämnade gården appellationssystemet, och alla viner säljs i dag som Vin de France.",
    descriptionEn:
      "Mark Angeli bought the estate in Anjou in 1990 and has farmed biodynamically from the start. Blanderies is Chenin Blanc from a single vineyard, made in very small quantities and aged for a long time in old oak barrels. After repeated rejections by the INAO tasting panel the estate left the appellation system, and all wines are now sold as Vin de France.",
  },
  {
    rank: 52,
    wine: "Les Vignes d'Autrefois",
    producer: "Laherte Frères",
    topProducerName: "Laherte Frères",
    region: "Chavot, Coteaux Sud d'Épernay, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Pinot Meunier",
    description:
      "Ren Meunier från gamla stockar planterade mellan 1947 och 1964 i Chavot och Mancy, massalt urval och en liten del oympade stockar. Biodynamiskt odlat, sju månader på gamla bourgognefat utan malolaktisk jäsning och 30 månader på jästfällning i flaska.",
    descriptionEn:
      "Pure Meunier from old vines planted between 1947 and 1964 in Chavot and Mancy, massal selection and a small share of ungrafted vines. Biodynamically farmed, seven months in old Burgundy barrels without malolactic fermentation and 30 months on lees in bottle.",
  },
  {
    rank: 53,
    wine: "Cerasuolo d'Abruzzo",
    producer: "Valentini",
    topProducerName: "Valentini",
    region: "Abruzzo",
    country: "Italien",
    type: "Rosé",
    grapes: "Montepulciano",
    description:
      "Valentinis rosé på Montepulciano, gjord med samma stränga urval som domänens vita och röda. Ett av få roséviner som lagras och diskuteras på samma sätt som stora röda viner.",
    descriptionEn:
      "Valentini's rosé from Montepulciano, made with the same strict selection as the domaine's white and red. One of the few rosés that is cellared and discussed in the same way as great red wines.",
  },
  {
    rank: 54,
    wine: "Les Vignes de Montgueux",
    producer: "Jacques Lassaigne / Emmanuel Lassaigne",
    topProducerName: "Jacques Lassaigne / Emmanuel Lassaigne",
    region: "Montgueux, Aube, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Chardonnay",
    description:
      "Chardonnay från en isolerad kritkulle väster om Troyes, en blandning av nio små parceller och flera årgångar. Emmanuel Lassaigne tog över familjedomänen 1999, ställde om till ekologisk odling, jäser med vilda jästsvampar och håller svavlet till ett absolut minimum.",
    descriptionEn:
      "Chardonnay from an isolated chalk hill west of Troyes, a blend of nine small parcels and several vintages. Emmanuel Lassaigne took over the family domaine in 1999, converted to organic farming, ferments with wild yeasts and keeps sulphur to a bare minimum.",
  },
  {
    rank: 55,
    wine: "Brouilly Vieilles Vignes",
    producer: "Jean-Claude Lapalu",
    topProducerName: "Jean-Claude Lapalu",
    region: "Saint-Étienne-la-Varenne, Brouilly, Beaujolais",
    country: "Frankrike",
    type: "Rött",
    grapes: "Gamay",
    description:
      "Gamay från stockar över 50 år i Saint-Étienne-la-Varenne i Brouilly. Ett bevis på att naturligt Beaujolais på hög nivå finns utanför Morgon.",
    descriptionEn:
      "Gamay from vines over 50 years old in Saint-Étienne-la-Varenne in Brouilly. Proof that top-level natural Beaujolais exists outside Morgon.",
  },
  {
    rank: 56,
    wine: "Vino Rosso San Valentino",
    producer: "Paolo Bea",
    topProducerName: "Paolo Bea",
    region: "Umbria",
    country: "Italien",
    type: "Rött",
    grapes: "Sangiovese, Montepulciano, Sagrantino",
    description:
      "40 procent Sangiovese, 40 procent Sagrantino och 20 procent Montepulciano. Giampiero Bea bestämmer macerationstiden år för år, 2018 var den 52 dagar. Två år i ståltank och två år på stora slavonska ekfat, sedan buteljerat utan klarning eller filtrering.",
    descriptionEn:
      "40 percent Sangiovese, 40 percent Sagrantino and 20 percent Montepulciano. Giampiero Bea sets the maceration length year by year; in 2018 it was 52 days. Two years in stainless steel and two years in large Slavonian oak casks, then bottled without fining or filtration.",
  },
  {
    rank: 57,
    wine: "Le Garde-Corps",
    producer: "Philippe Bornard",
    topProducerName: "Philippe Bornard",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Trousseau",
    description:
      "Trousseau från lieu-dit Garde-Corps på blå lera i Pupillin. Philippe Bornard lämnade Pupillins kooperativ och startade sin egen domän 2005, på inrådan av Pierre Overnoy.",
    descriptionEn:
      "Trousseau from the lieu-dit Garde-Corps on blue clay in Pupillin. Philippe Bornard left the Pupillin cooperative and started his own domaine in 2005, on the advice of Pierre Overnoy.",
  },
  {
    rank: 58,
    wine: "La Lune",
    producer: "Mark Angeli / Ferme de la Sansonnière",
    topProducerName: "Mark Angeli / Ferme de la Sansonnière",
    region: "Thouarcé, Anjou, Loire",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chenin Blanc",
    description:
      "Gårdens första torra vita, Chenin Blanc från stockar mellan 4 och 75 år på lera och kalk, efter att vingårdarna ställts om från guyot till buskstockar. Vinifierat naturligt och lagrat på gamla ekfat. Sedan årgång 2021 är alla gårdens viner torra och ofiltrerade.",
    descriptionEn:
      "The estate's first dry white, Chenin Blanc from vines between 4 and 75 years old on clay and limestone, after the vineyards were converted from guyot to bush vines. Vinified naturally and aged in old oak. Since the 2021 vintage all the estate's wines are dry and unfiltered.",
  },
  {
    rank: 59,
    wine: "Serragghia Zibibbo Bianco",
    producer: "Gabrio Bini / Serragghia",
    topProducerName: "Gabrio Bini / Serragghia",
    region: "Pantelleria, Sicilien",
    country: "Italien",
    type: "Vitt",
    grapes: "Zibibbo (Muscat d'Alexandrie)",
    description:
      "Gabrio Bini, tidigare arkitekt i Milano, flyttade till Pantelleria 1995 och gjorde sin första skörd 2005. Zibibbo från gamla, oympade buskstockar i den UNESCO-erkända alberello pantesco-formen, med lång skalkontakt och jäsning i amforor som delvis grävts ner i vingården. Varken klarat eller filtrerat.",
    descriptionEn:
      "Gabrio Bini, a former architect in Milan, moved to Pantelleria in 1995 and made his first harvest in 2005. Zibibbo from old, ungrafted bush vines in the UNESCO-recognised alberello pantesco form, with long skin contact and fermentation in amphorae partly buried in the vineyard. Neither fined nor filtered.",
  },
  {
    rank: 60,
    wine: "Lunar",
    producer: "Movia",
    topProducerName: "Movia",
    region: "Brda, Slovenien",
    country: "Slovenien",
    type: "Orange",
    grapes: "Rebula",
    description:
      "Rebula från Goriška Brda i Slovenien, ekologiskt odlat och med lite svavel. Aleš Kristančič gör Lunar av hela bär som jäser i fat utan pressning, och vinet tappas av efter månens faser.",
    descriptionEn:
      "Rebula from Goriška Brda in Slovenia, organically farmed and with little sulphur. Aleš Kristančič makes Lunar from whole berries fermented in barrel without pressing, and the wine is racked according to the phases of the moon.",
  },
  {
    rank: 61,
    wine: "Trousseau Les Grands Vergers",
    producer: "Michel Gahier",
    topProducerName: "Michel Gahier",
    region: "Montigny-les-Arsures, Arbois, Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Trousseau",
    description:
      "Trousseau från 80 år gamla stockar på lera över kalk i Montigny-les-Arsures, lagrat på en blandning av akaciafat och fat av amerikansk ek. Familjen har bott i byn sedan 1500-talet, men Michel är den förste som buteljerar själv. Han odlar 7,5 hektar ekologiskt, bearbetar jorden med tre hästar och tillsätter mycket lite svavel.",
    descriptionEn:
      "Trousseau from 80-year-old vines on clay over limestone in Montigny-les-Arsures, aged in a mix of acacia and American oak barrels. The family has lived in the village since the 16th century, but Michel is the first to bottle himself. He farms 7.5 hectares organically, works the soil with three horses and adds very little sulphur.",
  },
  {
    rank: 62,
    wine: "Fac-Simile",
    producer: "Jérôme Prévost / La Closerie",
    topProducerName: "Jérôme Prévost / La Closerie",
    region: "Gueux, Montagne de Reims, Champagne",
    country: "Frankrike",
    type: "Rosé",
    grapes: "Pinot Meunier",
    description:
      "Prévosts rosé är i princip en kopia av Les Béguines med omkring tio procent stilla rött vin tillsatt. Det röda görs på Meunier från ett hörn av samma vingård, där stockarna är angripna av court-noué och ger små, koncentrerade klasar.",
    descriptionEn:
      "Prévost's rosé is in essence a copy of Les Béguines with about ten percent still red wine added. The red is made from Meunier from a corner of the same vineyard, where the vines are affected by fanleaf virus and give small, concentrated bunches.",
  },
  {
    rank: 63,
    wine: "Fou du Roi",
    producer: "Axel Prüfer / Le Temps des Cerises",
    topProducerName: "Axel Prüfer / Le Temps des Cerises",
    region: "Le Bousquet-d'Orb, Haut-Languedoc, Hérault",
    country: "Frankrike",
    type: "Rött",
    grapes: "Grenache, Cinsault, Carignan",
    description:
      "Grenache, Cinsault och Carignan från bergen ovanför Béziers. Axel Prüfer växte upp i Östtyskland och slog sig ner i Le Mas Blanc 2003. Han odlar omkring 15 hektar på granit och kvarts, jäser med vilda jästsvampar och tillsätter inget svavel i något skede.",
    descriptionEn:
      "Grenache, Cinsault and Carignan from the hills above Béziers. Axel Prüfer grew up in East Germany and settled in Le Mas Blanc in 2003. He farms around 15 hectares on granite and quartz, ferments with wild yeasts and adds no sulphur at any stage.",
  },
  {
    rank: 64,
    wine: "Puro",
    producer: "Movia",
    topProducerName: "Movia",
    region: "Brda, Slovenien",
    country: "Slovenien",
    type: "Mousserande",
    grapes: "Chardonnay, Pinot Noir",
    description:
      "Mousserande på 60 procent Chardonnay och 40 procent Ribolla Gialla, andra jäsningen och fyra års lagring i ekfat. Puro säljs odegorgerad med jästfällningen kvar i flaskan och utan tillsatt svavel. Köparen degorgerar själv, helst under vatten, eller dricker vinet grumligt.",
    descriptionEn:
      "Sparkling wine from 60 percent Chardonnay and 40 percent Ribolla Gialla, with second fermentation and four years of ageing in oak. Puro is sold undisgorged with the lees still in the bottle and without added sulphur. The buyer disgorges it, preferably under water, or drinks the wine cloudy.",
  },
  {
    rank: 65,
    wine: "Riesling Grand Cru Steinert",
    producer: "Pierre Frick",
    topProducerName: "Pierre Frick",
    region: "Alsace",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Riesling",
    description:
      "Riesling från Grand Cru Steinert på kalkjord i Pfaffenheim. Familjen Frick ställde om till ekologisk odling 1970, Jean-Pierre Frick gick över till biodynamik 1981 och gör sedan 1999 viner helt utan tillsatt svavel.",
    descriptionEn:
      "Riesling from Grand Cru Steinert on limestone soils in Pfaffenheim. The Frick family converted to organic farming in 1970, Jean-Pierre Frick moved to biodynamics in 1981 and has made wines with no added sulphur at all since 1999.",
  },
  {
    rank: 66,
    wine: "Le Mont Benoit Extra Brut",
    producer: "Emmanuel Brochet",
    topProducerName: "Emmanuel Brochet",
    region: "Villers-Aux-Noeuds, Montagne de Reims, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Pinot Meunier, Pinot Noir, Chardonnay",
    description:
      "Brochets champagne från hans enda vingård på cirka 2,5 hektar premier cru i Villers-aux-Nœuds, väster om Montagne de Reims, på lera och silt. Meunier, Pinot Noir och Chardonnay. Brochet tog över gården 1997.",
    descriptionEn:
      "Brochet's champagne from his single vineyard of about 2.5 hectares of premier cru in Villers-aux-Nœuds, west of the Montagne de Reims, on clay and silt. Meunier, Pinot Noir and Chardonnay. Brochet took over the estate in 1997.",
  },
  {
    rank: 67,
    wine: "Dorabella Poulsard",
    producer: "L'Octavin / Alice Bouvot",
    topProducerName: "L'Octavin / Alice Bouvot",
    region: "Arbois, Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Poulsard",
    description:
      "Poulsard från över 50 år gamla stockar i La Mailloche och En Curon norr om Arbois. Handplockat, spontanjäst med hela klasar och 20 dagars maceration, tolv månader på gamla bourgognefat. Alice Bouvot tillsätter inget svavel i något av sina viner.",
    descriptionEn:
      "Poulsard from vines over 50 years old in La Mailloche and En Curon north of Arbois. Hand-harvested, spontaneously fermented as whole bunches with 20 days of maceration, twelve months in old Burgundy barrels. Alice Bouvot adds no sulphur to any of her wines.",
  },
  {
    rank: 68,
    wine: "Les Lendemains qui Chantent",
    producer: "Axel Prüfer / Le Temps des Cerises",
    topProducerName: "Axel Prüfer / Le Temps des Cerises",
    region: "Le Bousquet-d'Orb, Haut-Languedoc, Hérault",
    country: "Frankrike",
    type: "Rött",
    grapes: "Grenache",
    description:
      "Grenache från Prüfers avlägsna, skogsomgivna vingårdar ovanför Béziers, där avkastningen ibland är så låg som tio hektoliter per hektar. Som alla hans viner jäst med vilda jästsvampar, buteljerat utan klarning, filtrering eller tillsatt svavel.",
    descriptionEn:
      "Grenache from Prüfer's remote, forest-surrounded vineyards above Béziers, where yields are sometimes as low as ten hectolitres per hectare. Like all his wines, fermented with wild yeasts and bottled without fining, filtration or added sulphur.",
  },
  {
    rank: 69,
    wine: "Trauben, Liebe und Zeit",
    producer: "Franz Strohmeier",
    topProducerName: "Franz Strohmeier",
    region: "Weststeiermark, Österrike",
    country: "Österrike",
    type: "Mousserande",
    grapes: "Blauer Wildbacher",
    description:
      "Mousserande på Blauer Wildbacher, den druva som Weststeiermark är känt för genom roséstilen Schilcher. Strohmeier odlar ekologiskt och biodynamiskt på järn- och kiselrik jord i Bad Gams.",
    descriptionEn:
      "Sparkling wine from Blauer Wildbacher, the grape Weststeiermark is known for through the rosé style Schilcher. Strohmeier farms organically and biodynamically on iron- and silica-rich soils in Bad Gams.",
  },
  {
    rank: 70,
    wine: "Roc d'Anglade Rouge",
    producer: "Rémy Pédreno",
    topProducerName: "Rémy Pédreno / Roc d'Anglade",
    region: "Gard, Languedoc",
    country: "Frankrike",
    type: "Rött",
    grapes: "Carignan, Syrah, Grenache, Mourvèdre",
    description:
      "Carignan, Syrah, Grenache och Mourvèdre från Langlade i Gard. Rémy Pédreno odlar ekologiskt, arbetar med minimal intervention i källaren och säljer vinerna som IGP Gard i stället för under appellation.",
    descriptionEn:
      "Carignan, Syrah, Grenache and Mourvèdre from Langlade in the Gard. Rémy Pédreno farms organically, works with minimal intervention in the cellar and sells the wines as IGP Gard rather than under an appellation.",
  },
  {
    rank: 71,
    wine: "Chinuri Pétillant Naturel",
    producer: "Iago Bitarishvili",
    topProducerName: "Iago Bitarishvili",
    region: "Kartli, Georgien",
    country: "Georgien",
    type: "Mousserande",
    grapes: "Chinuri",
  },
  {
    rank: 72,
    wine: "Arboreus",
    producer: "Paolo Bea",
    topProducerName: "Paolo Bea",
    region: "Montefalco, Umbria",
    country: "Italien",
    type: "Vitt",
    grapes: "Trebbiano Spoletino",
  },
  {
    rank: 73,
    wine: "Le Cotet",
    producer: "Jacques Lassaigne / Emmanuel Lassaigne",
    topProducerName: "Jacques Lassaigne / Emmanuel Lassaigne",
    region: "Montgueux, Aube, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Chardonnay",
  },
  {
    rank: 74,
    wine: "Pinot Gris Macération",
    producer: "Pierre Frick",
    topProducerName: "Pierre Frick",
    region: "Pfaffenheim, Alsace",
    country: "Frankrike",
    type: "Orange",
    grapes: "Pinot Gris",
  },
  {
    rank: 75,
    wine: "Melon La Fauquette",
    producer: "Michel Gahier",
    topProducerName: "Michel Gahier",
    region: "Montigny-les-Arsures, Arbois, Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Melon à Queue Rouge",
  },
  {
    rank: 76,
    wine: "Muntada",
    producer: "Domaine Gauby / Gérard & Lionel Gauby",
    topProducerName: "Domaine Gauby / Gérard & Lionel Gauby",
    region: "Calce, Roussillon",
    country: "Frankrike",
    type: "Rött",
    grapes: "Grenache, Carignan",
  },
  {
    rank: 77,
    wine: "Theodora",
    producer: "Gut Oggau",
    topProducerName: "Gut Oggau",
    region: "Oggau, Burgenland, Österrike",
    country: "Österrike",
    type: "Vitt",
    grapes: "Grüner Veltliner, Welschriesling",
  },
  {
    rank: 78,
    wine: "Pinot Noir En Billat",
    producer: "Jean-François Ganevat",
    topProducerName: "Jean-François Ganevat",
    region: "Grusse, Côtes du Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Pinot Noir",
  },
  {
    rank: 79,
    wine: "Matassa Rouge",
    producer: "Domaine Matassa / Tom Lubbe",
    topProducerName: "Domaine Matassa / Tom Lubbe",
    region: "Calce, Roussillon",
    country: "Frankrike",
    type: "Rött",
    grapes: "Lledoner Pelut",
  },
  {
    rank: 80,
    wine: "Ploussard En Aspis",
    producer: "Renaud Bruyère & Adeline Houillon",
    topProducerName: "Renaud Bruyère & Adeline Houillon",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    type: "Rött",
    grapes: "Ploussard",
  },
  {
    rank: 81,
    wine: "Blaufränkisch Mechthild",
    producer: "Gut Oggau",
    topProducerName: "Gut Oggau",
    region: "Burgenland, Österrike",
    country: "Österrike",
    type: "Rött",
    grapes: "Blaufränkisch",
  },
  {
    rank: 82,
    wine: "Jakot",
    producer: "Dario Prinčič",
    topProducerName: "Dario Prinčič",
    region: "Oslavia, Friuli Collio",
    country: "Italien",
    type: "Orange",
    grapes: "Friulano (Jakot)",
  },
  {
    rank: 83,
    wine: "Riesling Pündericher Marienburg",
    producer: "Clemens Busch",
    topProducerName: "Clemens Busch",
    region: "Mosel, Tyskland",
    country: "Tyskland",
    type: "Vitt",
    grapes: "Riesling",
  },
  {
    rank: 84,
    wine: "Les Tourillons",
    producer: "Renaud Bruyère & Adeline Houillon",
    topProducerName: "Renaud Bruyère & Adeline Houillon",
    region: "Arbois, Jura",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chardonnay, Savagnin",
  },
  {
    rank: 85,
    wine: "Riesling Cuvée Particulière",
    producer: "Domaine Gérard Schueller & Fils / Bruno Schueller",
    topProducerName: "Domaine Gérard Schueller & Fils / Bruno Schueller",
    region: "Husseren-les-Châteaux, Alsace",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Riesling",
  },
  {
    rank: 86,
    wine: "Larmande",
    producer: "Le Mazel / Gérald & Jocelyne Oustric",
    topProducerName: "Le Mazel / Gérald & Jocelyne Oustric",
    region: "Valvignères, Ardèche",
    country: "Frankrike",
    type: "Rött",
    grapes: "Syrah",
  },
  {
    rank: 87,
    wine: "Lousas Parcela Camino Novo",
    producer: "Envinate",
    topProducerName: "Envinate",
    region: "Amandi, Ribeira Sacra, Galicien",
    country: "Spanien",
    type: "Rött",
    grapes: "Mencía, Garnacha Tintorera",
  },
  {
    rank: 88,
    wine: "Ex Vero III",
    producer: "Werlitsch / Ewald Tscheppe",
    topProducerName: "Werlitsch / Ewald Tscheppe",
    region: "Südsteiermark, Österrike",
    country: "Österrike",
    type: "Vitt",
    grapes: "Sauvignon Blanc, Morillon (Chardonnay)",
  },
  {
    rank: 89,
    wine: "Barolo",
    producer: "Bartolo Mascarello / Maria Teresa Mascarello",
    topProducerName: "Bartolo Mascarello / Maria Teresa Mascarello",
    region: "Barolo, Piemonte",
    country: "Italien",
    type: "Rött",
    grapes: "Nebbiolo",
  },
  {
    rank: 90,
    wine: "Mademoiselle M",
    producer: "Alexandre Bain",
    topProducerName: "Alexandre Bain",
    region: "Tracy-sur-Loire, Pouilly-Fumé, Loire",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Sauvignon Blanc",
  },
  {
    rank: 91,
    wine: "Empreinte",
    producer: "Benoît Courault",
    topProducerName: "Benoît Courault",
    region: "Faye d'Anjou, Anjou, Loire",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Chenin Blanc",
  },
  {
    rank: 92,
    wine: "Faugères Jadis",
    producer: "Domaine Léon Barral / Didier Barral",
    topProducerName: "Didier Barral / Domaine Léon Barral",
    region: "Lenthéric, Faugères, Languedoc",
    country: "Frankrike",
    type: "Rött",
    grapes: "Carignan, Grenache, Syrah",
  },
  {
    rank: 93,
    wine: "Les Hautes Vignes",
    producer: "Emmanuel Brochet",
    topProducerName: "Emmanuel Brochet",
    region: "Villers-Aux-Noeuds, Montagne de Reims, Champagne",
    country: "Frankrike",
    type: "Champagne",
    grapes: "Chardonnay, Pinot Meunier",
  },
  {
    rank: 94,
    wine: "Le Feu",
    producer: "Domaine Belluard",
    topProducerName: "Domaine Belluard",
    region: "Ayse, Savoie",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Gringet",
  },
  {
    rank: 95,
    wine: "Auksinis",
    producer: "Sébastien Riffault",
    topProducerName: "Sébastien Riffault",
    region: "Sury-en-Vaux, Sancerre, Loire",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Sauvignon Blanc",
  },
  {
    rank: 96,
    wine: "Schiste Blanc",
    producer: "Domaine des Ardoisières / Brice Omont",
    topProducerName: "Domaine des Ardoisières / Brice Omont",
    region: "Coteaux de Cévins, Savoie",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Jacquère, Roussanne, Pinot Gris, Mondeuse Blanche",
  },
  {
    rank: 97,
    wine: "Nuits-Saint-Georges Clos des Corvées",
    producer: "Prieuré Roch",
    topProducerName: "Prieuré Roch",
    region: "Bourgogne",
    country: "Frankrike",
    type: "Rött",
    grapes: "Pinot Noir",
  },
  {
    rank: 98,
    wine: "Riesling Grand Cru Pfersigberg",
    producer: "Domaine Gérard Schueller & Fils / Bruno Schueller",
    topProducerName: "Domaine Gérard Schueller & Fils / Bruno Schueller",
    region: "Husseren-les-Châteaux, Alsace",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Riesling",
  },
  {
    rank: 99,
    wine: "Palo Blanco",
    producer: "Envinate",
    topProducerName: "Envinate",
    region: "Valle de La Orotava, Tenerife, Kanarieöarna",
    country: "Spanien",
    type: "Vitt",
    grapes: "Listán Blanco",
  },
  {
    rank: 100,
    wine: "Cailloux",
    producer: "Patrick Bouju / La Bohème",
    topProducerName: "Patrick Bouju / La Bohème",
    region: "Puy-de-Dôme, Auvergne",
    country: "Frankrike",
    type: "Rött",
    grapes: "Pinot Noir",
  },
];