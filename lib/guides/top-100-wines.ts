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
    description:
      "Iago Bitarishvili odlar två hektar 60 år gamla Chinuri-stockar på kalkjord i Mukhranidalen och arbetar från byn Chardakhi i Kartli. Chinuri är regionens egen vita druva, med hög naturlig syra. Iago blev 2005 den förste i Georgien att certifieras för odling utan kemikalier och tillsätter inget svavel i något skede.",
    descriptionEn:
      "Iago Bitarishvili farms two hectares of 60-year-old Chinuri vines on limestone in the Mukhrani Valley and works from the village of Chardakhi in Kartli. Chinuri is the region's own white grape, with high natural acidity. In 2005 Iago became the first in Georgia to be certified for chemical-free farming, and he adds no sulphur at any stage.",
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
    description:
      "Trebbiano Spoletino från gamla stockar som klättrar upp i lönn- och almträd, en gammal umbrisk odlingsform. Tre till sex veckors skalkontakt med vilda jästsvampar, en liten andel torkade druvor i jäsningen och över sex månader på jästfällningen. Första årgång var 2004.",
    descriptionEn:
      "Trebbiano Spoletino from old vines that climb maple and elm trees, an old Umbrian training method. Three to six weeks of skin contact with wild yeasts, a small share of dried grapes in the fermentation and more than six months on the lees. The first vintage was 2004.",
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
    description:
      "Ren Chardonnay från över 50 år gamla stockar på kalkjord i Montgueux. Varje parcell vinifieras separat, vinet lagras 12 till 24 månader på fat och sedan ett till fem år på flaska. Extra brut.",
    descriptionEn:
      "Pure Chardonnay from vines over 50 years old on limestone in Montgueux. Each parcel is vinified separately, the wine is aged 12 to 24 months in barrel and then one to five years in bottle. Extra brut.",
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
    description:
      "Pinot Gris med cirka en veckas skalkontakt, spontanjäst, några månader på gamla ekfat och buteljerat utan klarning, filtrering eller tillsatt svavel. Ett av de orangeviner som visar hur Alsace kan arbeta med skalkontakt.",
    descriptionEn:
      "Pinot Gris with about a week of skin contact, spontaneously fermented, a few months in old oak and bottled without fining, filtration or added sulphur. One of the orange wines that shows how Alsace can work with skin contact.",
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
    description:
      "Melon à Queue Rouge, en lokal mutation av Chardonnay vars skal skiftar mot rött vid stjälken, på blå märgel. Gjort under jästhinna i stor foudre utan påfyllning, vilket ger en kontrollerad oxidation, och sedan lagrat i fat av jurasisk ek.",
    descriptionEn:
      "Melon à Queue Rouge, a local mutation of Chardonnay whose skin shifts towards red near the stem, on blue marl. Made under a veil of yeast in a large foudre without topping up, which gives controlled oxidation, and then aged in Jura oak barrels.",
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
    description:
      "Gaubys cuvée från mycket gamla stockar, främst Grenache och Carignan, i Calce. Gérard Gauby ärvde sin farfars cirka fem hektar 1985, då druvorna såldes till kooperativet. I dag driver han domänen med sonen Lionel och odlar biodynamiskt.",
    descriptionEn:
      "Gauby's cuvée from very old vines, mainly Grenache and Carignan, in Calce. Gérard Gauby inherited about five hectares from his grandfather in 1985, when the grapes were sold to the cooperative. Today he runs the domaine with his son Lionel and farms biodynamically.",
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
    description:
      "Grüner Veltliner och Welschriesling från Oggau i Burgenland. Eduard och Stephanie Tscheppe startade Gut Oggau 2007 och döpte varje vin efter en familjemedlem med ett tecknat ansikte på etiketten. Demeter-certifierat, nio månader på stora begagnade fat, ofiltrerat och utan tillsatt svavel.",
    descriptionEn:
      "Grüner Veltliner and Welschriesling from Oggau in Burgenland. Eduard and Stephanie Tscheppe started Gut Oggau in 2007 and named each wine after a family member with a drawn face on the label. Demeter certified, nine months in large used barrels, unfiltered and without added sulphur.",
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
    description:
      "Pinot Noir från parcellen En Billat i Grusse, på skiffer och märgel. Handplockat, vinifierat naturligt utan tillsatser och lagrat ett år på ekfat. Ganevat odlar certifierat ekologiskt och biodynamiskt och håller avkastningen medvetet låg.",
    descriptionEn:
      "Pinot Noir from the En Billat parcel in Grusse, on schist and marl. Hand-harvested, vinified naturally without additives and aged a year in oak barrels. Ganevat farms certified organic and biodynamic and keeps yields deliberately low.",
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
    description:
      "Sydafrikanen Tom Lubbe var källarmästare hos Gauby innan han 2003 grundade Matassa i Calce. 20 hektar certifierat ekologiskt på skiffer och svart märgel, biodynamiska metoder och endast en liten svaveldos vid buteljering. Rouge bygger på Lledoner Pelut, en lokal form av Grenache.",
    descriptionEn:
      "South African Tom Lubbe was cellar master at Gauby before founding Matassa in Calce in 2003. 20 hectares certified organic on schist and black marl, biodynamic methods and only a small dose of sulphur at bottling. The Rouge is built on Lledoner Pelut, a local form of Grenache.",
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
    description:
      "Från lieu-dit En Aspis i Pupillin. Adeline Houillon är syster till Emmanuel Houillon hos Overnoy, och Renaud Bruyère arbetade flera år hos Stéphane Tissot. Paret odlar fyra hektar, gör nästan allt själva och använder inget svavel alls.",
    descriptionEn:
      "From the lieu-dit En Aspis in Pupillin. Adeline Houillon is the sister of Emmanuel Houillon at Overnoy, and Renaud Bruyère worked for several years with Stéphane Tissot. The couple farm four hectares, do almost everything themselves and use no sulphur at all.",
  },
  {
    rank: 81,
    wine: "Mechthild",
    producer: "Gut Oggau",
    topProducerName: "Gut Oggau",
    region: "Burgenland, Österrike",
    country: "Österrike",
    type: "Vitt",
    grapes: "Grüner Veltliner",
    description:
      "Ren Grüner Veltliner från omkring 60 år gamla stockar i Oggau, två år på fat och buteljerat utan klarning, filtrering eller tillsatt svavel. Gut Oggau är Demeter-certifierat och döper varje vin efter en familjemedlem.",
    descriptionEn:
      "Pure Grüner Veltliner from vines around 60 years old in Oggau, two years in barrel and bottled without fining, filtration or added sulphur. Gut Oggau is Demeter certified and names each wine after a family member.",
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
    description:
      "Friulano från Oslavia, några stenkast från den slovenska gränsen, där Prinčič gjort vin sedan åtminstone 1993. Cirka tio hektar branta terrasser på lera och kalk, lång skalkontakt, spontanjäsning och lång lagring på fat, ofiltrerat. Han använder svavel och koppar långt under gränserna för ekologisk och biodynamisk odling.",
    descriptionEn:
      "Friulano from Oslavia, a stone's throw from the Slovenian border, where Prinčič has made wine since at least 1993. About ten hectares of steep terraces on clay and limestone, long skin contact, spontaneous fermentation and long ageing in barrel, unfiltered. He uses sulphur and copper well below the limits for organic and biodynamic farming.",
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
    description:
      "Riesling från Marienburg i Pünderich, där blå, röd och grå skiffer förekommer och kapselns färg på Buschs flaskor anger skiffertypen. Familjen slutade med herbicider 1976, ställde om till ekologisk odling 1984 och till biodynamik 2005.",
    descriptionEn:
      "Riesling from the Marienburg in Pünderich, where blue, red and grey slate occur and the capsule colour on Busch's bottles indicates the slate type. The family stopped using herbicides in 1976, converted to organic farming in 1984 and to biodynamics in 2005.",
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
    description:
      "80 procent Chardonnay och 20 procent Savagnin från lieu-dit Les Tourillons på kalkhaltig jord. Fyllt på under fatlagringen för att begränsa oxidationen, alltså den ouillé-stil som ger en friskare jurasisk vit. Paret använder inget svavel.",
    descriptionEn:
      "80 percent Chardonnay and 20 percent Savagnin from the lieu-dit Les Tourillons on limestone-rich soils. Topped up during barrel ageing to limit oxidation, the ouillé style that gives a fresher Jura white. The couple use no sulphur.",
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
    description:
      "Riesling från Husseren-les-Châteaux, den högst belägna byn längs Alsaces vinväg. Bruno Schueller odlar cirka tio hektar biodynamiskt utan certifiering, jäser med vilda jästsvampar, låter den malolaktiska jäsningen gå och lagrar länge. Hans viner underkänns ibland av de officiella provningspanelerna för att de inte motsvarar förväntad stil.",
    descriptionEn:
      "Riesling from Husseren-les-Châteaux, the highest village on the Alsace Wine Route. Bruno Schueller farms about ten hectares biodynamically without certification, ferments with wild yeasts, lets malolactic fermentation run and ages for a long time. His wines are sometimes rejected by the official tasting panels for not matching the expected style.",
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
    description:
      "Syrah från Valvignères i Ardèche. Gérald Oustric slutade sälja druvor till kooperativet efter att ha träffat Marcel Lapierre och räknas som en av naturvinsrörelsens gudfäder i Ardèche. Han odlar ekologiskt och biodynamiskt och gör sina viner utan tillsatt svavel.",
    descriptionEn:
      "Syrah from Valvignères in the Ardèche. Gérald Oustric stopped selling grapes to the cooperative after meeting Marcel Lapierre and is regarded as one of the godfathers of natural wine in the Ardèche. He farms organically and biodynamically and makes his wines without added sulphur.",
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
    description:
      "85 procent Mencía och 15 procent Alicante Bouschet från en enskild parcell i Amandi, cirka 70 år gamla stockar på skiffer på omkring 430 meters höjd. Fottrampat och jäst med hela klasar och vilda jästsvampar i öppna kar, sedan tolv månader på neutrala 500-litersfat.",
    descriptionEn:
      "85 percent Mencía and 15 percent Alicante Bouschet from a single parcel in Amandi, vines about 70 years old on slate at around 430 metres. Foot-trodden and fermented with whole clusters and wild yeasts in open vats, then twelve months in neutral 500-litre barrels.",
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
    description:
      "Lika delar Chardonnay och Sauvignon Blanc från de brantaste och magraste lotterna högst upp på kullen. Några dagars skalkontakt, spontanjäsning i öppna ekkar på 3 000 liter, två år på fin jästfällning i samma kar och tolv månader på flaska. Utan tillsatt svavel, oklarat och ofiltrerat.",
    descriptionEn:
      "Equal parts Chardonnay and Sauvignon Blanc from the steepest and leanest plots at the top of the hill. A few days of skin contact, spontaneous fermentation in open 3,000-litre oak vats, two years on fine lees in the same vats and twelve months in bottle. No added sulphur, unfined and unfiltered.",
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
    description:
      "En enda Barolo, blandad från Cannubi, Rué, Rocche och Rocche dell'Annunziata och samjäst eftersom parcellerna mognar samtidigt. Inga odlade jästsvampar, ingen temperaturkontroll och lagring på traditionella stora fat. Bartolo blev känd för etiketten No Barrique No Berlusconi. Dottern Maria Teresa har drivit domänen sedan hans död 2005.",
    descriptionEn:
      "A single Barolo, blended from Cannubi, Rué, Rocche and Rocche dell'Annunziata and co-fermented because the parcels ripen together. No cultured yeasts, no temperature control and ageing in traditional large casks. Bartolo became known for the label No Barrique No Berlusconi. His daughter Maria Teresa has run the domaine since his death in 2005.",
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
    description:
      "Sauvignon Blanc från kimmeridgekalk i Tracy-sur-Loire, lagrat 18 månader på foudre och utan tillsatt svavel. Alexandre Bain plöjer med häst, odlar biodynamiskt och förlorade rätten till appellationen Pouilly-Fumé från 2014, så vinerna säljs som Vin de France.",
    descriptionEn:
      "Sauvignon Blanc from Kimmeridgian limestone in Tracy-sur-Loire, aged 18 months in foudre and without added sulphur. Alexandre Bain ploughs with horses, farms biodynamically and lost the right to the Pouilly-Fumé appellation from 2014, so the wines are sold as Vin de France.",
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
    description:
      "Chenin Blanc på djupare lera och skiffer i Faye-d'Anjou. Benoît Courault utbildade sig i Beaune och arbetade tre år på Domaine de l'Anglore innan han köpte sex hektar i Anjou, som han odlat biodynamiskt sedan starten. Utan tillsatser, långsam jäsning och lång lagring på gamla fat. Säljs som Vin de France.",
    descriptionEn:
      "Chenin Blanc on deeper clay and schist in Faye-d'Anjou. Benoît Courault trained in Beaune and worked three years at Domaine de l'Anglore before buying six hectares in Anjou, which he has farmed biodynamically from the start. No additives, slow fermentation and long ageing in old barrels. Sold as Vin de France.",
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
    description:
      "Hälften Carignan, 30 procent Syrah och 20 procent Grenache från 30 till 60 år gamla stockar på skiffer i Faugères. Två vintrar på fat i kalla stenkällare och buteljerat ofiltrerat. Didier Barral är trettonde generationen i Lenthéric och odlar omkring 30 hektar biodynamiskt.",
    descriptionEn:
      "Half Carignan, 30 percent Syrah and 20 percent Grenache from vines 30 to 60 years old on schist in Faugères. Two winters in barrel in cold stone cellars and bottled unfiltered. Didier Barral is the thirteenth generation in Lenthéric and farms around 30 hectares biodynamically.",
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
    description:
      "Från stockarna högst upp i sluttningen på Mont Benoit, med omkring 30 centimeter matjord över krita. Hälften Chardonnay och hälften Meunier i 2017, elva månader på begagnade ekfat och över sex år på jästfällningen, utan dosage. Biodynamiskt odlat.",
    descriptionEn:
      "From the vines at the top of the slope on the Mont Benoit, with about 30 centimetres of topsoil over chalk. Half Chardonnay and half Meunier in 2017, eleven months in seasoned oak barrels and more than six years on the lees, with no dosage. Biodynamically farmed.",
  },
  {
    rank: 94,
    wine: "Le Feu",
    producer: "Domaine du Gringet (tidigare Domaine Belluard)",
    topProducerName: "Domaine Belluard",
    region: "Ayse, Savoie",
    country: "Frankrike",
    type: "Vitt",
    grapes: "Gringet",
    description:
      "Gringet, en druva med bara omkring 20 hektar i världen, från en enskild parcell på röd märgel i Ayse. Dominique Belluard dog 2021, och sedan årgång 2022 görs vinet av fyra partner under namnet Domaine du Gringet. Helklaspressat, svavel tillsätts före jäsningen i betongägg eller sandstensamforor, och vinet buteljeras utan ytterligare svavel, klarning eller filtrering.",
    descriptionEn:
      "Gringet, a grape with only around 20 hectares in the world, from a single parcel on red marl in Ayse. Dominique Belluard died in 2021, and since the 2022 vintage the wine has been made by four partners under the name Domaine du Gringet. Whole-bunch pressed, sulphur is added before fermentation in concrete eggs or sandstone jars, and the wine is bottled without further sulphur, fining or filtration.",
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
    description:
      "Sauvignon Blanc från Sury-en-Vaux med lång skalkontakt och lång lagring på gamla fat. Namnet är litauiska för guld, efter Riffaults fru Jurgitas modersmål. Biodynamiskt odlat, sen och selektiv skörd och inget svavel vid buteljering.",
    descriptionEn:
      "Sauvignon Blanc from Sury-en-Vaux with long skin contact and long ageing in old barrels. The name is Lithuanian for gold, after the native language of Riffault's wife Jurgita. Biodynamically farmed, late and selective harvest and no sulphur at bottling.",
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
    description:
      "Jacquère, Roussanne, Malvoisie (Savoies namn på Pinot Gris) och Mondeuse Blanche från skifferbranter på över 500 meters höjd i Cevins. Domänen grundades 1998 för att återplantera en övergiven sluttning, och Brice Omont driver den sedan 2010. Biodynamiskt, allt handarbete på sluttningar upp till 60 procents lutning.",
    descriptionEn:
      "Jacquère, Roussanne, Malvoisie (the Savoie name for Pinot Gris) and Mondeuse Blanche from schist slopes above 500 metres in Cevins. The domaine was founded in 1998 to replant an abandoned hillside, and Brice Omont has run it since 2010. Biodynamic, all handwork on slopes of up to 60 percent.",
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
    description:
      "Monopol på 5,21 hektar premier cru i Nuits-Saint-Georges. Henry-Frédéric Roch, senare meddirektör på Domaine de la Romanée-Conti, grundade domänen 1988 och slutade helt med svavel 1995. Hela klasar, vilda jästsvampar och fottrampning i träkar. Yannick Champ driver domänen sedan Rochs död 2018.",
    descriptionEn:
      "A 5.21-hectare premier cru monopole in Nuits-Saint-Georges. Henry-Frédéric Roch, later co-director of Domaine de la Romanée-Conti, founded the domaine in 1988 and stopped using sulphur entirely in 1995. Whole clusters, wild yeasts and foot treading in wooden vats. Yannick Champ has run the domaine since Roch's death in 2018.",
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
    description:
      "Riesling från Grand Cru Pfersigberg, som Husseren-les-Châteaux delar med grannbyn Eguisheim. Bruno Schueller odlar omkring tio hektar biodynamiskt utan kemiska medel, jäser med vilda jästsvampar och gör vinerna utan tillsatser. Ett vin för lagring.",
    descriptionEn:
      "Riesling from Grand Cru Pfersigberg, which Husseren-les-Châteaux shares with neighbouring Eguisheim. Bruno Schueller farms around ten hectares biodynamically without chemicals, ferments with wild yeasts and makes the wines without additives. A wine for ageing.",
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
    description:
      "Listán Blanco från en enskild parcell på vulkanisk jord på 600 meters höjd i Valle de La Orotava på Teneriffa. Oympade stockar över 100 år, uppbundna i den traditionella flätade formen cordón trenzado. Spontanjäst utan tillsatser, klarning eller filtrering och lagrat främst på stora, gamla foudres.",
    descriptionEn:
      "Listán Blanco from a single parcel on volcanic soil at 600 metres in the Valle de La Orotava on Tenerife. Ungrafted vines over 100 years old, trained in the traditional braided cordón trenzado. Spontaneously fermented without additions, fining or filtration and aged mainly in large, old foudres.",
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
    description:
      "Pinot Noir från 45 år gamla stockar på märgel och kalk i Puy-de-Dôme i Auvergne. Maceration med hela klasar och två års lagring i amforor av stengods och ekfat. Certifierat ekologiskt, biodynamiska metoder och plöjning med djur.",
    descriptionEn:
      "Pinot Noir from 45-year-old vines on marl and limestone in Puy-de-Dôme in the Auvergne. Whole-cluster maceration and two years of ageing in stoneware amphorae and oak barrels. Certified organic, biodynamic methods and ploughing with animals.",
  },

];