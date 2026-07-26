export interface TopProducer {
  rank: number;
  name: string;
  region: string;
  country: string;
  grapes: string;
  description?: string;
  descriptionEn?: string;
}

export const TOP_100_PRODUCERS: TopProducer[] = [
  {
    rank: 1,
    name: "Pierre Overnoy / Emmanuel Houillon",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    grapes: "Savagnin, Chardonnay, Poulsard",
    description:
      "Om naturvinet har en startpunkt är det här. Pierre Overnoy slutade tillsätta svavel redan på 1980-talet, inspirerad av kemisten Jules Chauvets forskning om jäsning utan tillsatser. Hans Savagnin — vinifierad ouillé, alltså påfylld och inte under jästtäcke som traditionell Jura — visade att viner utan svavel kunde åldras i decennier snarare än månader. Sedan 2001 drivs domänet av Emmanuel Houillon, som Overnoy tog in som lärling och sedan utsåg till efterträdare.",
    descriptionEn:
      "If natural wine has a starting point, this is it. Pierre Overnoy stopped adding sulphur back in the 1980s, inspired by the chemist Jules Chauvet's research into fermentation without additives. His Savagnin — vinified ouillé, meaning topped up rather than aged under a veil of yeast as Jura tradition dictates — proved that wines without sulphur could age for decades rather than months. Since 2001 the domaine has been run by Emmanuel Houillon, whom Overnoy took on as an apprentice and later named his successor.",
  },
  {
    rank: 2,
    name: "Thierry Allemand",
    region: "Cornas, Rhône",
    country: "Frankrike",
    grapes: "Syrah",
    description:
      "Allemand började som arbetare hos Robert Michel och byggde sitt eget domän genom att plantera om övergivna terrasser i Cornas när appellationen låg nere. Hans två cuvéer — Chaillot och Reynard — räknas idag till Syrahs absoluta toppskikt i världen. Vinifieringen är minimal med mycket låg svavelanvändning och stor precision snarare än dogmatik.",
    descriptionEn:
      "Allemand began as a labourer for Robert Michel and built his own domaine by replanting abandoned terraces in Cornas when the appellation was at its lowest. His two cuvées — Chaillot and Reynard — are today counted among the finest expressions of Syrah in the world. The winemaking is minimal, with very low sulphur and great precision rather than dogma.",
  },
  {
    rank: 3,
    name: "Joško Gravner",
    region: "Friuli Collio / Oslavje",
    country: "Italien",
    grapes: "Ribolla Gialla, Pinot Grigio, Chardonnay",
    description:
      "Gravner var en tekniskt skicklig modernist som 1997 gjorde en resa till Georgien och kom tillbaka med en helt ny idé om vad vitt vin kunde vara. Från 2001 vinifierar han i qvevri — georgiska lerkärl nedgrävda i marken — med lång skalkontakt och utan temperaturkontroll. Hans Ribolla Gialla är den enskilt viktigaste flaskan i det moderna orangevinets historia.",
    descriptionEn:
      "Gravner was a technically accomplished modernist until a 1997 trip to Georgia gave him an entirely new idea of what white wine could be. From 2001 he has vinified in qvevri — Georgian clay vessels buried in the ground — with long skin contact and no temperature control. His Ribolla Gialla is the single most important bottle in the history of modern orange wine.",
  },
  {
    rank: 4,
    name: "Jean-François Ganevat",
    region: "Côtes du Jura",
    country: "Frankrike",
    grapes: "Chardonnay, Savagnin, Poulsard, Trousseau",
    description:
      "Ganevat arbetade tio år i Bourgogne innan han återvände till familjedomänet i Rotalier och började göra viner som ingen annan i Jura. Hans sortiment är extremt — dussintals cuvéer per årgång, många från enskilda parceller med stockar planterade av hans farfar. Låga svavelnivåer, långsam elevage och en precision som gjort honom till en av naturvinets mest eftersökta producenter.",
    descriptionEn:
      "Ganevat spent ten years in Burgundy before returning to the family domaine in Rotalier and making wines unlike anyone else in the Jura. His range is extreme — dozens of cuvées per vintage, many from individual parcels with vines planted by his grandfather. Low sulphur, slow élevage and a precision that has made him one of natural wine's most sought-after producers.",
  },
  {
    rank: 5,
    name: "Jacques Selosse",
    region: "Avize, Champagne",
    country: "Frankrike",
    grapes: "Chardonnay, Pinot Noir",
    description:
      "Anselme Selosse tog med sig bourgognetänkandet till Champagne och förändrade regionen inifrån. Istället för att blanda bort terroiret arbetade han med enskilda byar, låga skördar, fatjäsning och oxidativ elevage — ett radikalt brott mot husens standardiserade stil. Selosse är den enskilt största anledningen till att grower champagne existerar som kategori idag.",
    descriptionEn:
      "Anselme Selosse brought Burgundian thinking to Champagne and changed the region from within. Instead of blending away terroir, he worked with individual villages, low yields, barrel fermentation and oxidative élevage — a radical break from the houses' standardised style. Selosse is the single biggest reason grower champagne exists as a category today.",
  },
  {
    rank: 6,
    name: "Pheasant's Tears",
    region: "Kakheti, Georgien",
    country: "Georgien",
    grapes: "Rkatsiteli, Mtsvane, Saperavi",
    description:
      "Grundat av den amerikanske konstnären John Wurdeman och vignerons Gela Patalishvili i hjärtat av Kakheti. Projektet handlar lika mycket om kulturbevarande som om vin — de har återupplivat georgiska druvsorter som var på väg att försvinna helt. Vinerna görs i qvevri enligt en metod som är åtta tusen år gammal.",
    descriptionEn:
      "Founded by the American artist John Wurdeman and vigneron Gela Patalishvili in the heart of Kakheti. The project is as much about cultural preservation as wine — they have revived Georgian grape varieties that were on the verge of disappearing entirely. The wines are made in qvevri using a method that is eight thousand years old.",
  },
  {
    rank: 7,
    name: "Domaine des Miroirs / Kenjiro Kagami",
    region: "Côtes du Jura",
    country: "Frankrike",
    grapes: "Chardonnay, Savagnin, Trousseau",
    description:
      "Kenjiro Kagami kom från Japan, arbetade hos Ganevat och etablerade sig sedan på egna parceller i Jura. Produktionen är mycket liten och cuvéerna har poetiska namn som speglar en estetik lika mycket som ett vin. Vinerna är extremt precisa, mineraliska och närmast omöjliga att köpa till listpris.",
    descriptionEn:
      "Kenjiro Kagami came from Japan, worked with Ganevat and then established himself on his own parcels in the Jura. Production is tiny and the cuvées carry poetic names that reflect an aesthetic as much as a wine. The wines are extremely precise, mineral and virtually impossible to buy at list price.",
  },
  {
    rank: 8,
    name: "Radikon",
    region: "Friuli Collio / Oslavje",
    country: "Italien",
    grapes: "Ribolla Gialla, Friulano, Merlot",
    description:
      "Stanko Radikon återvände 1995 till sin farfars metod: lång skalkontakt på Ribolla Gialla, ingen temperaturkontroll, inget tillsatt svavel. Tillsammans med Gravner definierade han det moderna orangevinet. Radikon utvecklade också egna flaskformat på 500 ml och en liter, byggda på idén att vin ska delas. Sonen Saša driver domänet sedan Stankos död 2016.",
    descriptionEn:
      "Stanko Radikon returned in 1995 to his grandfather's method: long skin contact on Ribolla Gialla, no temperature control, no added sulphur. Together with Gravner he defined modern orange wine. Radikon also developed his own 500 ml and one-litre bottle formats, built on the idea that wine should be shared. His son Sasa has run the domaine since Stanko's death in 2016.",
  },
  {
    rank: 9,
    name: "Clos Rougeard (Foucault)",
    region: "Saumur-Champigny, Loire",
    country: "Frankrike",
    grapes: "Cabernet Franc, Chenin Blanc",
    description:
      "Bröderna Charly och Nady Foucault drev Clos Rougeard i en tid när Cabernet Franc från Loire betraktades som enkelt vin. De arbetade utan kemi, jäste spontant, lagrade i gamla fat och gjorde viner som visade att Saumur-Champigny kunde tävla med Bordeaux och Bourgogne. Le Bourg och Les Poyeux är referensviner för druvsorten.",
    descriptionEn:
      "Brothers Charly and Nady Foucault ran Clos Rougeard at a time when Cabernet Franc from the Loire was considered simple wine. They worked without chemicals, fermented spontaneously, aged in old barrels and made wines that showed Saumur-Champigny could stand alongside Bordeaux and Burgundy. Le Bourg and Les Poyeux are reference wines for the grape.",
  },
  {
    rank: 10,
    name: "Jean Foillard",
    region: "Morgon, Beaujolais",
    country: "Frankrike",
    grapes: "Gamay",
    description:
      "Foillard är en av de fyra Beaujolais-producenter — tillsammans med Lapierre, Thévenet och Breton — som på 1980-talet vände ryggen åt regionens industriella nouveau-produktion. Alla fyra var influerade av Jules Chauvet och började odla ekologiskt, skörda sent och jäsa utan tillsatt jäst eller svavel. Gruppen kallas fortfarande \"the Gang of Four\".",
    descriptionEn:
      "Foillard is one of four Beaujolais producers — with Lapierre, Thévenet and Breton — who turned their backs on the region's industrial nouveau production in the 1980s. All four were influenced by Jules Chauvet and began farming organically, harvesting late and fermenting without added yeast or sulphur. The group is still known as the Gang of Four.",
  },
  {
    rank: 11,
    name: "Ramaz Nikoladze",
    region: "Imereti, Georgien",
    country: "Georgien",
    grapes: "Tsitska, Tsolikouri, Krakhuna",
    description:
      "En av de centrala figurerna i det georgiska naturvinets återfödelse. Arbetar med Tsitska och Tsolikouri i qvevri och har varit avgörande för att koppla ihop den georgiska traditionen med den europeiska naturvinsrörelsen.",
    descriptionEn:
      "One of the central figures in the rebirth of Georgian natural wine. He works with Tsitska and Tsolikouri in qvevri and has been decisive in connecting the Georgian tradition with the European natural wine movement.",
  },
  {
    rank: 12,
    name: "Marcel Lapierre",
    region: "Morgon, Beaujolais",
    country: "Frankrike",
    grapes: "Gamay",
    description:
      "Den mest inflytelserika av Gang of Four. Lapierre tog Jules Chauvets idéer och gjorde dem till praktik, och hans Morgon blev mallen för vad ett naturligt Beaujolais kunde vara. Sonen Mathieu driver domänet sedan 2010.",
    descriptionEn:
      "The most influential of the Gang of Four. Lapierre took Jules Chauvet's ideas and put them into practice, and his Morgon became the template for what a natural Beaujolais could be. His son Mathieu has run the domaine since 2010.",
  },
  {
    rank: 13,
    name: "Frank Cornelissen",
    region: "Etna Nord, Sicilien",
    country: "Italien",
    grapes: "Nerello Mascalese",
    description:
      "Belgaren som flyttade till Etnas nordsluttning och driver minimal intervention längre än nästan någon annan. Magma, hans toppcuvée på Nerello Mascalese från gamla stockar högt upp på vulkanen, är ett av naturvinets mest omdiskuterade viner.",
    descriptionEn:
      "The Belgian who moved to the northern slope of Etna and pushes minimal intervention further than almost anyone. Magma, his top cuvée of Nerello Mascalese from old vines high on the volcano, is one of natural wine's most debated wines.",
  },
  {
    rank: 14,
    name: "Cédric Bouchard / Roses de Jeanne",
    region: "Aube, Champagne",
    country: "Frankrike",
    grapes: "Pinot Noir, Chardonnay",
    description:
      "Bouchards filosofi är kompromisslös: en parcell, en druvsort, en årgång — aldrig blandningar. Produktionen är minimal och vinerna har en renhet och lätthet som står i skarp kontrast till Champagnes husstil.",
    descriptionEn:
      "Bouchard's philosophy is uncompromising: one parcel, one variety, one vintage — never blends. Production is minimal and the wines have a purity and lightness that stands in sharp contrast to Champagne's house style.",
  },
  {
    rank: 15,
    name: "Nicolas Joly",
    region: "Savennières, Loire",
    country: "Frankrike",
    grapes: "Chenin Blanc",
    description:
      "Joly är biodynamikens mest högljudda ambassadör i vinvärlden och drivkraften bakom Return to Terroir. Coulée de Serrant är en av få franska appellationer som består av en enda vingård, och hans Chenin Blanc därifrån delar åsikter men lämnar ingen oberörd.",
    descriptionEn:
      "Joly is the wine world's most vocal ambassador for biodynamics and the driving force behind Return to Terroir. Coulée de Serrant is one of few French appellations consisting of a single vineyard, and his Chenin Blanc from there divides opinion but leaves no one indifferent.",
  },
  {
    rank: 16,
    name: "Yvon Métras",
    region: "Fleurie, Beaujolais",
    country: "Frankrike",
    grapes: "Gamay",
    description:
      "Kultproducent som arbetar med helklase, spontanjäsning och nära noll svavel. Métras viner är bland de svåraste att få tag på i hela Beaujolais och har en genomskinlighet och energi som få kommer i närheten av.",
    descriptionEn:
      "A cult producer working with whole clusters, spontaneous fermentation and near-zero sulphur. Métras' wines are among the hardest to find in all of Beaujolais and have a transparency and energy few come close to.",
  },
  {
    rank: 17,
    name: "Philippe Bornard",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    grapes: "Poulsard, Trousseau, Chardonnay",
    description:
      "Granne och nära vän till Pierre Overnoy, med samma kompromisslösa hållning till svavel. Bornards Poulsard — bleka, doftande och elektriska — hör till Juras mest karaktärsfulla röda viner.",
    descriptionEn:
      "Neighbour and close friend of Pierre Overnoy, with the same uncompromising stance on sulphur. Bornard's Poulsard — pale, perfumed and electric — is among the Jura's most characterful red wines.",
  },
  {
    rank: 18,
    name: "Bénédicte & Stéphane Tissot",
    region: "Montigny-lès-Arsures, Arbois, Jura",
    country: "Frankrike",
    grapes: "Trousseau, Chardonnay, Poulsard",
    description:
      "Biodynamisk odling över ett ovanligt brett sortiment, från traditionell vin jaune under jästtäcke till moderna ouillé-viner och mousserande. Tissot är den producent som bäst visar hela Juras spännvidd.",
    descriptionEn:
      "Biodynamic farming across an unusually broad range, from traditional vin jaune under flor to modern ouillé wines and sparkling. Tissot is the producer who best shows the full breadth of the Jura.",
  },
  {
    rank: 19,
    name: "Renaud Bruyère & Adeline Houillon",
    region: "Arbois-Pupillin, Jura",
    country: "Frankrike",
    grapes: "Ploussard, Chardonnay, Savagnin, Trousseau",
    description:
      "Adeline Houillon är syster till Emmanuel Houillon, och domänet står i direkt linje från Overnoy-traditionen. Små volymer, inget tillsatt svavel och en precision som gjort dem till en av Juras mest eftersökta unga producenter.",
    descriptionEn:
      "Adeline Houillon is Emmanuel Houillon's sister, and the domaine stands in direct line from the Overnoy tradition. Small volumes, no added sulphur and a precision that has made them one of the Jura's most sought-after young producers.",
  },
  {
    rank: 20,
    name: "La Stoppa / Elena Pantaleoni",
    region: "Rivergaro, Colli Piacentini, Emilia-Romagna",
    country: "Italien",
    grapes: "Malvasia di Candia Aromatica, Barbera, Bonarda, Ortrugo",
    description:
      "Pantaleoni gjorde La Stoppa till en av Italiens viktigaste naturvinsadresser. Ageno — Malvasia med lång skalkontakt — är ett av de orangeviner som definierat kategorin utanför Friuli.",
    descriptionEn:
      "Pantaleoni made La Stoppa one of Italy's most important natural wine addresses. Ageno — Malvasia with long skin contact — is one of the orange wines that defined the category outside Friuli.",
  },
  {
    rank: 21,
    name: "Jérôme Prévost / La Closerie",
    region: "Gueux, Montagne de Reims, Champagne",
    country: "Frankrike",
    grapes: "Pinot Meunier, Pinot Gris, Chardonnay",
    description:
      "Prévost fick sin start med hjälp av Anselme Selosse och gör champagne på nästan uteslutande Pinot Meunier från en enda parcell i Gueux. Vinerna är texturrika, oxidativa och helt personliga.",
    descriptionEn:
      "Prévost got his start with help from Anselme Selosse and makes champagne from almost entirely Pinot Meunier grown in a single parcel in Gueux. The wines are textured, oxidative and entirely personal.",
  },
  {
    rank: 22,
    name: "Château Rayas",
    region: "Châteauneuf-du-Pape, Rhône",
    country: "Frankrike",
    grapes: "Grenache",
    description:
      "Rayas står utanför naturvinsrörelsens retorik men har alltid arbetat därefter: ren Grenache på sandjord, ingen ny ek, minimal intervention. Vinerna har en eterisk lätthet som ingen annan i appellationen kommer nära.",
    descriptionEn:
      "Rayas stands outside the natural wine movement's rhetoric but has always worked accordingly: pure Grenache on sandy soil, no new oak, minimal intervention. The wines have an ethereal lightness no one else in the appellation comes near.",
  },
  {
    rank: 23,
    name: "Valentini",
    region: "Loreto Aprutino, Abruzzo",
    country: "Italien",
    grapes: "Trebbiano d'Abruzzo, Montepulciano",
    description:
      "Extremt traditionellt, extremt slutet familjedomän som deklasserar större delen av produktionen och bara buteljerar det de själva står för. Trebbiano d'Abruzzo från Valentini är ett av Italiens mest legendariska vita viner.",
    descriptionEn:
      "An extremely traditional, extremely private family domaine that declassifies most of its production and bottles only what it stands behind. Trebbiano d'Abruzzo from Valentini is one of Italy's most legendary white wines.",
  },
  {
    rank: 24,
    name: "Dard & Ribo",
    region: "Saint-Joseph / Crozes-Hermitage, Rhône",
    country: "Frankrike",
    grapes: "Syrah, Marsanne, Roussanne",
    description:
      "René-Jean Dard och François Ribo var naturvinspionjärer i norra Rhône långt innan det fanns en rörelse att tillhöra. Deras Syrah är lätt, doftande och saftig — motsatsen till regionens extraherade stil.",
    descriptionEn:
      "René-Jean Dard and François Ribo were natural wine pioneers in the northern Rhône long before there was a movement to belong to. Their Syrah is light, perfumed and juicy — the opposite of the region's extracted style.",
  },
  {
    rank: 25,
    name: "Jean-Pierre Robinot",
    region: "Chahaignes, Jasnières / Coteaux du Loir, Loire",
    country: "Frankrike",
    grapes: "Chenin Blanc, Pineau d'Aunis",
    description:
      "Robinot drev en av Paris första naturvinsbarer innan han blev vigneron i Loire. Hans Chenin Blanc och Pineau d'Aunis är kompromisslöst gjorda utan svavel och har en vildhet som speglar mannen bakom.",
    descriptionEn:
      "Robinot ran one of Paris's first natural wine bars before becoming a vigneron in the Loire. His Chenin Blanc and Pineau d'Aunis are made uncompromisingly without sulphur and have a wildness that mirrors the man behind them.",
  },
  {
    rank: 26,
    name: "Hervé Souhaut / Romaneaux-Destezet",
    region: "Ardèche",
    country: "Frankrike",
    grapes: "Syrah, Viognier",
    description:
      "Souhaut gör Syrah från granitjordar i Ardèche med helklase och minimal intervention. Vinerna är lätta, pepprade och genomskinliga — ett av de tydligaste exemplen på hur Syrah kan smaka utan extraktion.",
    descriptionEn:
      "Souhaut makes Syrah from granite soils in the Ardèche using whole clusters and minimal intervention. The wines are light, peppery and transparent — one of the clearest examples of how Syrah can taste without extraction.",
  },
  {
    rank: 27,
    name: "Marie-Noëlle Ledru",
    region: "Ambonnay, Champagne",
    country: "Frankrike",
    grapes: "Pinot Noir",
    description:
      "Ledru arbetade ensam i Ambonnay i decennier och gjorde grower champagne på Pinot Noir med mycket låg dosage. Vinerna är strama, mineraliska och en av de renaste tolkningarna av grand cru-byn.",
    descriptionEn:
      "Ledru worked alone in Ambonnay for decades, making grower champagne from Pinot Noir with very low dosage. The wines are taut, mineral and among the purest interpretations of the grand cru village.",
  },
  {
    rank: 28,
    name: "Domaine Huet",
    region: "Vouvray, Loire",
    country: "Frankrike",
    grapes: "Chenin Blanc",
    description:
      "Biodynamisk sedan 1990 och referenspunkt för Chenin Blanc i alla stilar — torrt, halvtorrt, sött och mousserande. Le Mont, Le Haut-Lieu och Clos du Bourg visar hur tre parceller i samma appellation kan ge helt olika viner.",
    descriptionEn:
      "Biodynamic since 1990 and a reference point for Chenin Blanc in every style — dry, off-dry, sweet and sparkling. Le Mont, Le Haut-Lieu and Clos du Bourg show how three parcels in the same appellation can give entirely different wines.",
  },
  {
    rank: 29,
    name: "Guy Breton",
    region: "Villié-Morgon, Beaujolais",
    country: "Frankrike",
    grapes: "Gamay",
    description:
      "Den fjärde i Gang of Four, känd som \"P'tit Max\". Bretons Morgon är bland de mest omedelbart charmiga naturvinerna från Beaujolais — saftiga, lätta och gjorda för att drickas.",
    descriptionEn:
      "The fourth of the Gang of Four, known as P'tit Max. Breton's Morgon is among the most immediately charming natural wines from Beaujolais — juicy, light and made to be drunk.",
  },
  {
    rank: 30,
    name: "Paolo Bea",
    region: "Montefalco, Umbria",
    country: "Italien",
    grapes: "Sagrantino, Montepulciano, Grechetto",
    description:
      "Bea gör Sagrantino med lång maceration, ingen filtrering och flera års elevage innan release. Vinerna är strukturerade och långlivade och har gjort Montefalco till en naturvinsdestination.",
    descriptionEn:
      "Bea makes Sagrantino with long maceration, no filtration and several years of élevage before release. The wines are structured and long-lived, and have made Montefalco a natural wine destination.",
  },
  {
    rank: 31,
    name: "Jean Macle",
    region: "Château-Chalon, Jura",
    country: "Frankrike",
    grapes: "Savagnin",
  },
  {
    rank: 32,
    name: "Mark Angeli / Ferme de la Sansonnière",
    region: "Anjou / Saumur, Loire",
    country: "Frankrike",
    grapes: "Chenin Blanc, Cabernet Franc",
  },
  {
    rank: 33,
    name: "Laherte Frères",
    region: "Chavot, Champagne",
    country: "Frankrike",
    grapes: "Meunier, Chardonnay, Pinot Noir",
  },
  {
    rank: 34,
    name: "Jean-Claude Lapalu",
    region: "Saint-Etienne-la-Varenne, Beaujolais",
    country: "Frankrike",
    grapes: "Gamay",
  },
  {
    rank: 35,
    name: "Movia",
    region: "Brda, Slovenien",
    country: "Slovenien",
    grapes: "Rebula, Pinot Noir, Merlot",
  },
  {
    rank: 36,
    name: "Jacques Lassaigne / Emmanuel Lassaigne",
    region: "Montgueux, Aube, Champagne",
    country: "Frankrike",
    grapes: "Chardonnay",
  },
  {
    rank: 37,
    name: "Michel Gahier",
    region: "Montigny-les-Arsures, Jura",
    country: "Frankrike",
    grapes: "Trousseau, Melon à Queue Rouge",
  },
  {
    rank: 38,
    name: "Axel Prüfer / Le Temps des Cerises",
    region: "Le Bousquet-d'Orb, Haut-Languedoc, Hérault",
    country: "Frankrike",
    grapes: "Grenache, Cinsault, Carignan, Aramon, Chardonnay",
  },
  {
    rank: 39,
    name: "Emmanuel Brochet",
    region: "Villers-Aux-Noeuds, Montagne de Reims, Champagne",
    country: "Frankrike",
    grapes: "Pinot Meunier, Pinot Noir, Chardonnay",
  },
  {
    rank: 40,
    name: "Pierre Frick",
    region: "Pfaffenheim, Alsace",
    country: "Frankrike",
    grapes: "Riesling, Pinot Gris, Gewurztraminer",
  },
  {
    rank: 41,
    name: "Gabrio Bini / Serragghia",
    region: "Pantelleria, Sicilien",
    country: "Italien",
    grapes: "Zibibbo (Muscat of Alexandria), Nero d'Avola",
  },
  {
    rank: 42,
    name: "L'Octavin / Alice Bouvot",
    region: "Arbois, Jura",
    country: "Frankrike",
    grapes: "Poulsard, Chardonnay, Savagnin",
  },
  {
    rank: 43,
    name: "Franz Strohmeier",
    region: "Weststeiermark, Österrike",
    country: "Österrike",
    grapes: "Blauer Wildbacher (Schilcher)",
  },
  {
    rank: 44,
    name: "Patrick Bouju / La Bohème",
    region: "Saint-Georges-sur-Allier, Puy-de-Dôme, Auvergne",
    country: "Frankrike",
    grapes: "Pinot Noir, Gamay, Chardonnay",
  },
  {
    rank: 45,
    name: "Domaine Gauby / Gérard & Lionel Gauby",
    region: "Calce, Roussillon",
    country: "Frankrike",
    grapes: "Grenache, Carignan, Grenache Blanc, Macabeu, Muscat",
  },
  {
    rank: 46,
    name: "Rudolf Fürst",
    region: "Bürgstadt, Franken",
    country: "Tyskland",
    grapes: "Spätburgunder, Riesling, Weißburgunder",
  },
  {
    rank: 47,
    name: "Gérard Gauby",
    region: "Calce, Roussillon",
    country: "Frankrike",
    grapes: "Grenache, Carignan, Macabeu",
  },
  {
    rank: 48,
    name: "Gut Oggau",
    region: "Oggau, Burgenland",
    country: "Österrike",
    grapes: "Welschriesling, Blaufränkisch, Zweigelt, Traminer",
  },
  {
    rank: 49,
    name: "Domaine Matassa / Tom Lubbe",
    region: "Calce, Roussillon",
    country: "Frankrike",
    grapes: "Grenache Gris, Carignan, Muscat",
  },
  {
    rank: 50,
    name: "Envinate",
    region: "Galicien, Kanarieöarna & Bierzo, Spanien",
    country: "Spanien",
    grapes: "Mencía, Palomino, Listán Negro, Albariño",
  },
  {
    rank: 51,
    name: "Dario Prinčič",
    region: "Oslavia, Friuli Collio",
    country: "Italien",
    grapes: "Friulano (Jakot), Ribolla Gialla, Merlot",
  },
  {
    rank: 52,
    name: "Clemens Busch",
    region: "Pünderich, Mosel",
    country: "Tyskland",
    grapes: "Riesling",
  },
  {
    rank: 53,
    name: "Domaine Gérard Schueller & Fils / Bruno Schueller",
    region: "Husseren-les-Châteaux, Alsace",
    country: "Frankrike",
    grapes: "Riesling, Pinot Gris, Gewurztraminer",
  },
  {
    rank: 54,
    name: "Prieuré Roch",
    region: "Nuits-Saint-Georges, Bourgogne",
    country: "Frankrike",
    grapes: "Pinot Noir",
  },
  {
    rank: 55,
    name: "Anders Frederik Steen & Anne Bruun Blauert",
    region: "Valvignères, Ardèche",
    country: "Frankrike",
    grapes: "Grenache, Carignan, Syrah, Mourvèdre",
  },
  {
    rank: 56,
    name: "Werlitsch / Ewald Tscheppe",
    region: "Südsteiermark, Österrike",
    country: "Österrike",
    grapes: "Sauvignon Blanc, Morillon (Chardonnay)",
  },
  {
    rank: 57,
    name: "Domaine Belluard",
    region: "Ayse, Savoie",
    country: "Frankrike",
    grapes: "Gringet, Altesse, Mondeuse",
  },
  {
    rank: 58,
    name: "Jean-Yves Péron",
    region: "Conflans, Savoie",
    country: "Frankrike",
    grapes: "Altesse, Jacquère, Mondeuse, Persan",
  },
  {
    rank: 59,
    name: "Domaine Bizot / Jean-Yves Bizot",
    region: "Vosne-Romanée, Bourgogne",
    country: "Frankrike",
    grapes: "Pinot Noir, Chardonnay",
  },
  {
    rank: 60,
    name: "L'Anglore / Éric Pfifferling",
    region: "Tavel, Rhône",
    country: "Frankrike",
    grapes: "Grenache, Carignan, Cinsault, Clairette",
  },
  {
    rank: 61,
    name: "Le Mazel / Gérald & Jocelyne Oustric",
    region: "Valvignères, Ardèche",
    country: "Frankrike",
    grapes: "Syrah, Grenache, Carignan, Viognier, Cinsault",
  },
  {
    rank: 62,
    name: "Maxime Magnon",
    region: "Villeneuve-les-Corbières, Corbières",
    country: "Frankrike",
    grapes: "Carignan, Grenache, Terret Blanc",
  },
  {
    rank: 63,
    name: "Domaine des Ardoisières / Brice Omont",
    region: "Coteaux de Cévins, Savoie",
    country: "Frankrike",
    grapes: "Jacquère, Roussanne, Altesse, Persan, Mondeuse Noire, Mondeuse Blanche",
  },
  {
    rank: 64,
    name: "Les Foulards Rouges / Jean-François Nicq",
    region: "Roussillon",
    country: "Frankrike",
    grapes: "Grenache, Mourvèdre, Carignan",
  },
  {
    rank: 65,
    name: "Partida Creus / Massimo & Antonella",
    region: "Bonastre, Baix Penedès",
    country: "Spanien",
    grapes: "Sumoll, Xarel·lo, Macabeu",
  },
  {
    rank: 66,
    name: "Sébastien Riffault",
    region: "Sury-en-Vaux, Sancerre",
    country: "Frankrike",
    grapes: "Sauvignon Blanc",
  },
  {
    rank: 67,
    name: "Benoît Courault",
    region: "Faye d'Anjou, Anjou, Loire",
    country: "Frankrike",
    grapes: "Chenin Blanc, Cabernet Franc, Grolleau, Pineau d'Aunis",
  },
  {
    rank: 68,
    name: "Château Cambon / Marie Lapierre & Jean-Claude Chanudet",
    region: "Saint-Jean-d'Ardières, Beaujolais",
    country: "Frankrike",
    grapes: "Gamay",
  },
  {
    rank: 69,
    name: "Pierre-Olivier Bonhomme",
    region: "Les Montils, Touraine, Loire",
    country: "Frankrike",
    grapes: "Menu Pineau, Chenin Blanc, Gamay, Pineau d'Aunis, Sauvignon Blanc",
  },
  {
    rank: 70,
    name: "Alexandre Bain",
    region: "Tracy-sur-Loire, Pouilly-Fumé",
    country: "Frankrike",
    grapes: "Sauvignon Blanc",
  },
  {
    rank: 71,
    name: "Didier Barral / Domaine Léon Barral",
    region: "Lenthéric, Faugères",
    country: "Frankrike",
    grapes: "Mourvèdre, Carignan, Terret",
  },
  {
    rank: 72,
    name: "Clos du Rouge Gorge / Cyril Fhal",
    region: "Latour-de-France, Roussillon",
    country: "Frankrike",
    grapes: "Carignan, Grenache, Macabeu",
  },
  {
    rank: 73,
    name: "Cantina Giardino / Antonio & Daniela De Gruttola",
    region: "Ariano Irpino, Campania",
    country: "Italien",
    grapes: "Fiano, Greco, Aglianico, Coda di Volpe",
  },
  {
    rank: 74,
    name: "Clos des Grillons / Nicolas Renaud",
    region: "Rochefort-du-Gard, Rhône",
    country: "Frankrike",
    grapes: "Grenache, Cinsault, Carignan, Bourboulenc, Clairette",
  },
  {
    rank: 75,
    name: "João Pato aka Duckman / Maria Pato",
    region: "Bairrada, Portugal",
    country: "Portugal",
    grapes: "Baga, Bical, Cercial, Fernão Pires",
  },
  {
    rank: 76,
    name: "Rémy Pédreno / Roc d'Anglade",
    region: "Nîmes, Gard, Languedoc",
    country: "Frankrike",
    grapes: "Grenache, Carignan, Mourvèdre, Terret",
  },
  {
    rank: 77,
    name: "Arnot-Roberts",
    region: "North Coast, Kalifornien",
    country: "USA",
    grapes: "Trousseau Gris, Syrah, Chardonnay",
  },
  {
    rank: 78,
    name: "Milan Nestarec",
    region: "Velké Bílovice, Moravia",
    country: "Tjeckien",
    grapes: "Grüner Veltliner, Blaufränkisch, Welschriesling",
  },
  {
    rank: 79,
    name: "Domaine Gramenon / Michèle Aubéry-Laurent",
    region: "Montbrison-sur-Lez, Côtes du Rhône",
    country: "Frankrike",
    grapes: "Grenache, Viognier, Clairette",
  },
  {
    rank: 80,
    name: "Ochota Barrels",
    region: "McLaren Vale / Basket Range, Australien",
    country: "Australien",
    grapes: "Shiraz, Grenache, Gamay",
  },
  {
    rank: 81,
    name: "Bartolo Mascarello / Maria Teresa Mascarello",
    region: "Barolo, Piemonte",
    country: "Italien",
    grapes: "Nebbiolo, Dolcetto, Barbera, Freisa",
  },
  {
    rank: 82,
    name: "Emidio Pepe",
    region: "Torano Nuovo, Abruzzo",
    country: "Italien",
    grapes: "Montepulciano, Trebbiano d'Abruzzo",
  },
  {
    rank: 83,
    name: "Jeff Coutelou / Mas Coutelou",
    region: "Puimisson, Hérault, Languedoc",
    country: "Frankrike",
    grapes: "Carignan, Grenache, Cinsault, Terret",
  },
  {
    rank: 84,
    name: "Andrea Calek",
    region: "Alba-la-Romaine, Ardèche",
    country: "Frankrike",
    grapes: "Syrah, Grenache, Carignan, Viognier, Chardonnay",
  },
  {
    rank: 85,
    name: "Antony Tortul / La Sorga",
    region: "Languedoc / Roussillon",
    country: "Frankrike",
    grapes: "Cinsault, Grenache, Carignan",
  },
  {
    rank: 86,
    name: "Éric Texier",
    region: "Brézème, Côtes du Rhône",
    country: "Frankrike",
    grapes: "Syrah, Viognier, Grenache",
  },
  {
    rank: 87,
    name: "Descendientes de J. Palacios",
    region: "Corullón, Bierzo",
    country: "Spanien",
    grapes: "Mencía",
  },
  {
    rank: 88,
    name: "Laureano Serres / Mendall",
    region: "Terra Alta, Katalonien",
    country: "Spanien",
    grapes: "Garnatxa, Carignan, Macabeu, Garnatxa Blanca",
  },
  {
    rank: 89,
    name: "Aphros / Vasco Croft",
    region: "Lima, Vinho Verde",
    country: "Portugal",
    grapes: "Loureiro, Vinhão",
  },
  {
    rank: 90,
    name: "Domaine des Cavarodes / Étienne Thiébaud",
    region: "Cramans, Côtes du Jura",
    country: "Frankrike",
    grapes: "Trousseau, Chardonnay, Savagnin, Poulsard, Enfariné Noir",
  },
  {
    rank: 91,
    name: "Arianna Occhipinti",
    region: "Vittoria, Sicilien",
    country: "Italien",
    grapes: "Frappato, Nero d'Avola",
  },
  {
    rank: 92,
    name: "Christian Tschida",
    region: "Illmitz, Burgenland",
    country: "Österrike",
    grapes: "Welschriesling, Pinot Blanc, Traminer",
  },
  {
    rank: 93,
    name: "Le Coste / Antonuzi & Bouveron",
    region: "Gradoli, Lago di Bolsena, Lazio",
    country: "Italien",
    grapes: "Aleatico, Grechetto, Procanico, Roscetto",
  },
  {
    rank: 94,
    name: "Elisabetta Foradori",
    region: "Mezzolombardo, Trentino",
    country: "Italien",
    grapes: "Teroldego, Nosiola",
  },
  {
    rank: 95,
    name: "Les Bottes Rouges / Jean-Baptiste Menigoz",
    region: "Arbois & Abergement-le-Petit, Jura",
    country: "Frankrike",
    grapes: "Chardonnay, Savagnin, Poulsard, Trousseau, Pinot Noir",
  },
  {
    rank: 96,
    name: "Jacques Puffeney",
    region: "Montigny-les-Arsures, Jura",
    country: "Frankrike",
    grapes: "Trousseau, Poulsard, Chardonnay, Savagnin",
  },
  {
    rank: 97,
    name: "Stéphane Ogier",
    region: "Ampuis, Côte-Rôtie",
    country: "Frankrike",
    grapes: "Syrah, Viognier",
  },
  {
    rank: 98,
    name: "Domaine de la Tournelle / Evelyne Clairet",
    region: "Arbois, Jura",
    country: "Frankrike",
    grapes: "Poulsard, Trousseau, Chardonnay",
  },
  {
    rank: 99,
    name: "La Grange de l'Oncle Charles / Jérôme François",
    region: "Ostheim, Alsace",
    country: "Frankrike",
    grapes: "Co-plantation: Riesling, Pinot Gris, Gewurztraminer, Auxerrois, Pinot Noir, Muscat",
  },
  {
    rank: 100,
    name: "François Pinon",
    region: "Vernou-sur-Brenne, Vouvray",
    country: "Frankrike",
    grapes: "Chenin Blanc",
  },
];