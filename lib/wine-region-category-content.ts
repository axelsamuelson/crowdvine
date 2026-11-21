import type { WineCategoryFaqItem } from "@/lib/wine-category-types";
import type { WineRegionSlug } from "@/lib/wine-regions";

/**
 * Editorial copy for region category pages (/vin/naturvin-{slug}, /wine/{en-slug}-natural-wine).
 * Written 2026-11-03. EN is a literal translation of SV.
 * Rules (seo/url-struktur-och-sprak.md): no "direkt"/"köps från", no "utan tillsatser",
 * no time pressure, no price comparisons. Producer names = producers live on PACT 2026-11-03.
 * Champagne and Alsace intentionally omitted (<3 live wines, noindex).
 */
export type WineRegionCategoryCopy = {
  h1: string;
  title: string;
  metaDescription: string;
  description: string;
  contentHeading: string;
  longDescription: string;
  faq: WineCategoryFaqItem[];
};

export const WINE_REGION_CATEGORY_CONTENT: Partial<
  Record<WineRegionSlug, Record<"sv" | "en", WineRegionCategoryCopy>>
> = {
  languedoc: {
    sv: {
      h1: "Naturvin från Languedoc",
      title: "Naturvin från Languedoc | PACT Wines",
      metaDescription:
        "Naturvin från Languedoc: Carignan, Grenache och Syrah från skiffer och kalk i Faugères, Saint-Chinian och Haute Vallée de l'Orb. Hemleverans i Sverige.",
      description:
        "Languedoc sträcker sig längs Medelhavskusten mellan Rhônedeltat och Roussillon. Här finns det största urvalet hos PACT: röda, vita, orange och mousserande naturviner från småproducenter i Faugères, Saint-Chinian, Pic Saint-Loup och Haute Vallée de l'Orb.",
      contentHeading: "Om naturvin från Languedoc",
      longDescription:
        "Languedoc är ett av Frankrikes största vinområden. Länge var regionen känd för volym, men de senaste decennierna har en ny generation odlare tagit över gamla stockar på mager jord och börjat arbeta ekologiskt, med få eller inga tillsatser i källaren.\n\nTerroiret varierar mycket. I Faugères och delar av Saint-Chinian dominerar skiffer, som ger mörka, mineraliska röda viner. Kring Pic Saint-Loup och Pézenas finns mer kalksten. I Haute Vallée de l'Orb ligger vingårdarna högre upp, där svalare nätter bevarar syran. Garrigue, den torra buskmarken med timjan, rosmarin och lavendel, omger många av vingårdarna.\n\nDe röda vinerna bygger på Carignan, Grenache, Syrah, Cinsault och Mourvèdre, ofta i blend. Bland de vita finns Grenache Blanc, Clairette, Terret och Macabeu. Producenterna hos PACT i Languedoc är bland andra Clos Fantine, Mas des Mesures, Hors Saison, Château del Ranq, Julien Peyras, La Marotte, Le Bouc à Trois Pattes och Pèira Levada.",
      faq: [
        {
          question: "Vilka druvor odlas i Languedoc?",
          answer:
            "De vanligaste röda druvorna är Carignan, Grenache, Syrah, Cinsault och Mourvèdre. Bland de vita finns Grenache Blanc, Clairette, Terret, Macabeu och Roussanne. Många viner är blends av flera druvor.",
        },
        {
          question: "Vad är skillnaden mellan Faugères och Saint-Chinian?",
          answer:
            "Båda ligger i norra Languedoc. Faugères vilar nästan helt på skiffer, vilket ger mörka och mineraliska viner. Saint-Chinian har skiffer i norr och kalksten och lera i söder, så stilen varierar mer inom appellationen.",
        },
        {
          question: "Vad passar naturvin från Languedoc till?",
          answer:
            "De röda vinerna passar till grillat, lamm, korv och grytor med örter. De vita och orange vinerna passar till fisk, skaldjur, grönsaksrätter och ost. Läs mer i [guiden om naturvin från Languedoc](/guider/naturvin-languedoc).",
        },
      ],
    },
    en: {
      h1: "Natural wine from the Languedoc",
      title: "Natural Wine from the Languedoc | PACT Wines",
      metaDescription:
        "Natural wine from the Languedoc: Carignan, Grenache and Syrah from schist and limestone in Faugères, Saint-Chinian and Haute Vallée de l'Orb. Home delivery in Sweden.",
      description:
        "The Languedoc stretches along the Mediterranean coast between the Rhône delta and Roussillon. This is the largest selection at PACT: red, white, orange and sparkling natural wines from small producers in Faugères, Saint-Chinian, Pic Saint-Loup and Haute Vallée de l'Orb.",
      contentHeading: "About natural wine from the Languedoc",
      longDescription:
        "The Languedoc is one of France's largest wine regions. For a long time the region was known for volume, but in recent decades a new generation of growers has taken over old vines on poor soils and started working organically, with few or no additives in the cellar.\n\nThe terroir varies a great deal. In Faugères and parts of Saint-Chinian schist dominates, giving dark, mineral red wines. Around Pic Saint-Loup and Pézenas there is more limestone. In Haute Vallée de l'Orb the vineyards sit higher up, where cooler nights preserve the acidity. Garrigue, the dry scrubland with thyme, rosemary and lavender, surrounds many of the vineyards.\n\nThe red wines are built on Carignan, Grenache, Syrah, Cinsault and Mourvèdre, often blended. Among the whites are Grenache Blanc, Clairette, Terret and Macabeu. The producers at PACT in the Languedoc include Clos Fantine, Mas des Mesures, Hors Saison, Château del Ranq, Julien Peyras, La Marotte, Le Bouc à Trois Pattes and Pèira Levada.",
      faq: [
        {
          question: "Which grapes are grown in the Languedoc?",
          answer:
            "The most common red grapes are Carignan, Grenache, Syrah, Cinsault and Mourvèdre. Among the whites are Grenache Blanc, Clairette, Terret, Macabeu and Roussanne. Many wines are blends of several grapes.",
        },
        {
          question: "What is the difference between Faugères and Saint-Chinian?",
          answer:
            "Both lie in the northern Languedoc. Faugères rests almost entirely on schist, which gives dark and mineral wines. Saint-Chinian has schist in the north and limestone and clay in the south, so the style varies more within the appellation.",
        },
        {
          question: "What does natural wine from the Languedoc go with?",
          answer:
            "The red wines suit grilled food, lamb, sausages and stews with herbs. The white and orange wines suit fish, shellfish, vegetable dishes and cheese. Read more in the [guide to natural wine from the Languedoc](/guides/languedoc-natural-wine).",
        },
      ],
    },
  },

  loire: {
    sv: {
      h1: "Naturvin från Loire",
      title: "Naturvin från Loire | PACT Wines",
      metaDescription:
        "Naturvin från Loire: Chenin Blanc, Cabernet Franc, Muscadet och Gamay från småproducenter längs Frankrikes längsta flod. Hemleverans i Sverige.",
      description:
        "Loiredalen följer Frankrikes längsta flod från Atlantkusten in mot landets mitt. Svalt klimat ger friska viner med hög syra: Muscadet vid kusten, Chenin Blanc och Cabernet Franc i Anjou och Touraine, Sauvignon Blanc och Gamay längre uppströms.",
      contentHeading: "Om naturvin från Loire",
      longDescription:
        "Loire är en av de regioner där naturvinsrörelsen tidigt fick fäste, och många av de mest efterfrågade naturvinsproducenterna i Frankrike finns här. Avstånden är stora, så Loire är snarare flera vinområden längs samma flod än en enda region.\n\nNärmast Atlanten, kring Nantes, görs Muscadet på druvan Melon de Bourgogne, ofta lagrad på jästfällningen (sur lie). I Anjou och Saumur möts kalksten (tuffeau) och skiffer, och här görs Chenin Blanc i alla stilar och röda viner på Cabernet Franc. I Touraine ligger Chinon, Bourgueil och Montlouis-sur-Loire. Längre österut, i Centre-Loire, odlas Sauvignon Blanc i Sancerre och Menetou-Salon, och i de övre delarna mot Massif Central görs lätta röda viner på Gamay, som i Côte Roannaise och Auvergne.\n\nProducenterna hos PACT i Loire är Domaine de la Pépière, Bernard Baudry, Domaine des Roches Neuves, François Chidaine, Thibaud Boudignon, Domaine de Bellivière, Domaine Pellé, Domaine Sérol och Henri Chauvet.",
      faq: [
        {
          question: "Vilka druvor odlas i Loire?",
          answer:
            "De viktigaste vita druvorna är Chenin Blanc, Sauvignon Blanc och Melon de Bourgogne (Muscadet). Bland de röda dominerar Cabernet Franc, följt av Gamay, Pinot Noir och lokala druvor som Pineau d'Aunis och Grolleau.",
        },
        {
          question: "Vad betyder Muscadet sur lie?",
          answer:
            "Sur lie betyder att vinet har legat på jästfällningen under vintern innan det buteljeras. Det ger mer textur och en lätt brödig ton till ett annars stramt och salt vitt vin.",
        },
        {
          question: "Ska röda viner från Loire serveras kylda?",
          answer:
            "Lätta röda viner på Gamay, Pineau d'Aunis eller ung Cabernet Franc blir ofta bäst lätt kylda, runt 14 grader. Mer strukturerade Chinon och Saumur-Champigny serveras vid 15 till 16 grader.",
        },
      ],
    },
    en: {
      h1: "Natural wine from the Loire",
      title: "Natural Wine from the Loire | PACT Wines",
      metaDescription:
        "Natural wine from the Loire: Chenin Blanc, Cabernet Franc, Muscadet and Gamay from small producers along France's longest river. Home delivery in Sweden.",
      description:
        "The Loire Valley follows France's longest river from the Atlantic coast towards the centre of the country. A cool climate gives fresh wines with high acidity: Muscadet by the coast, Chenin Blanc and Cabernet Franc in Anjou and Touraine, Sauvignon Blanc and Gamay further upstream.",
      contentHeading: "About natural wine from the Loire",
      longDescription:
        "The Loire is one of the regions where the natural wine movement took hold early, and many of the most sought-after natural wine producers in France are found here. The distances are great, so the Loire is more several wine areas along the same river than a single region.\n\nClosest to the Atlantic, around Nantes, Muscadet is made from the Melon de Bourgogne grape, often aged on its lees (sur lie). In Anjou and Saumur limestone (tuffeau) meets schist, and here Chenin Blanc is made in every style alongside red wines from Cabernet Franc. Touraine is home to Chinon, Bourgueil and Montlouis-sur-Loire. Further east, in Centre-Loire, Sauvignon Blanc is grown in Sancerre and Menetou-Salon, and in the upper reaches towards the Massif Central light red wines are made from Gamay, as in Côte Roannaise and Auvergne.\n\nThe producers at PACT in the Loire are Domaine de la Pépière, Bernard Baudry, Domaine des Roches Neuves, François Chidaine, Thibaud Boudignon, Domaine de Bellivière, Domaine Pellé, Domaine Sérol and Henri Chauvet.",
      faq: [
        {
          question: "Which grapes are grown in the Loire?",
          answer:
            "The most important white grapes are Chenin Blanc, Sauvignon Blanc and Melon de Bourgogne (Muscadet). Among the reds Cabernet Franc dominates, followed by Gamay, Pinot Noir and local grapes such as Pineau d'Aunis and Grolleau.",
        },
        {
          question: "What does Muscadet sur lie mean?",
          answer:
            "Sur lie means the wine has rested on its lees through the winter before bottling. It gives more texture and a slightly bready note to an otherwise taut and salty white wine.",
        },
        {
          question: "Should red wines from the Loire be served chilled?",
          answer:
            "Light red wines from Gamay, Pineau d'Aunis or young Cabernet Franc are often best lightly chilled, around 14 degrees. More structured Chinon and Saumur-Champigny are served at 15 to 16 degrees.",
        },
      ],
    },
  },

  beaujolais: {
    sv: {
      h1: "Naturvin från Beaujolais",
      title: "Naturvin från Beaujolais | PACT Wines",
      metaDescription:
        "Naturvin från Beaujolais: Gamay från granit i Morgon, Fleurie, Brouilly, Chénas och Moulin-à-Vent. Regionen där naturvinsrörelsen började. Hemleverans i Sverige.",
      description:
        "Beaujolais ligger mellan Bourgogne och Lyon och är nästan helt Gamay. I norr ligger de tio cru-byarna på granit, där druvan ger både saftiga och mer strukturerade viner. Det var här den moderna naturvinsrörelsen tog form.",
      contentHeading: "Om naturvin från Beaujolais",
      longDescription:
        "Naturvinets historia börjar i stor utsträckning i Beaujolais. Kemisten och vinmakaren Jules Chauvet förespråkade redan i mitten av 1900-talet vin utan tillsatt svavel och med vildjäst. På 1980-talet tog fyra odlare i Villié-Morgon hans idéer vidare: Marcel Lapierre, Jean Foillard, Guy Breton och Jean-Paul Thévenet, ofta kallade Gang of Four.\n\nDruvan är Gamay. Söder om Villefranche är jorden mer lera och kalk, och här görs lättare viner under namnet Beaujolais. I norr dominerar granit och skiffer, och här finns Beaujolais-Villages och de tio crus: Saint-Amour, Juliénas, Chénas, Moulin-à-Vent, Fleurie, Chiroubles, Morgon, Régnié, Brouilly och Côte de Brouilly. Vinifieringen är ofta hel- eller halvkolsyrejäsning med hela klasar, vilket ger fruktiga viner med låg tannin.\n\nProducenterna hos PACT i Beaujolais är Jean Foillard, Alex Foillard, Domaine Thillardon, Domaine L&C Desvignes, Marc Delienne, Robert-Denogent och Arpayé.",
      faq: [
        {
          question: "Vad är en Beaujolais cru?",
          answer:
            "De tio crus är byar i norra Beaujolais med egen appellation: Saint-Amour, Juliénas, Chénas, Moulin-à-Vent, Fleurie, Chiroubles, Morgon, Régnié, Brouilly och Côte de Brouilly. Vinerna har mer struktur än vanlig Beaujolais och flera av dem tål lagring.",
        },
        {
          question: "Vad är Gang of Four?",
          answer:
            "Ett smeknamn på Marcel Lapierre, Jean Foillard, Guy Breton och Jean-Paul Thévenet, fyra odlare i Morgon som på 1980-talet började göra vin med vildjäst och lite eller inget svavel, inspirerade av Jules Chauvet.",
        },
        {
          question: "Ska Beaujolais serveras kylt?",
          answer:
            "Ja, gärna lätt kylt, runt 13 till 15 grader. De lättare vinerna kan serveras svalare och fungerar till allt från chark till kyckling. Morgon och Moulin-à-Vent tål en grad eller två varmare.",
        },
      ],
    },
    en: {
      h1: "Natural wine from Beaujolais",
      title: "Natural Wine from Beaujolais | PACT Wines",
      metaDescription:
        "Natural wine from Beaujolais: Gamay from granite in Morgon, Fleurie, Brouilly, Chénas and Moulin-à-Vent. The region where the natural wine movement began. Home delivery in Sweden.",
      description:
        "Beaujolais lies between Burgundy and Lyon and is almost entirely Gamay. In the north lie the ten cru villages on granite, where the grape gives both juicy and more structured wines. It was here that the modern natural wine movement took shape.",
      contentHeading: "About natural wine from Beaujolais",
      longDescription:
        "The history of natural wine largely begins in Beaujolais. The chemist and winemaker Jules Chauvet already advocated wine without added sulphur and with wild yeast in the middle of the 20th century. In the 1980s four growers in Villié-Morgon took his ideas further: Marcel Lapierre, Jean Foillard, Guy Breton and Jean-Paul Thévenet, often called the Gang of Four.\n\nThe grape is Gamay. South of Villefranche the soil is more clay and limestone, and lighter wines are made here under the name Beaujolais. In the north granite and schist dominate, and here are Beaujolais-Villages and the ten crus: Saint-Amour, Juliénas, Chénas, Moulin-à-Vent, Fleurie, Chiroubles, Morgon, Régnié, Brouilly and Côte de Brouilly. Vinification is often carbonic or semi-carbonic maceration with whole bunches, which gives fruity wines with low tannin.\n\nThe producers at PACT in Beaujolais are Jean Foillard, Alex Foillard, Domaine Thillardon, Domaine L&C Desvignes, Marc Delienne, Robert-Denogent and Arpayé.",
      faq: [
        {
          question: "What is a Beaujolais cru?",
          answer:
            "The ten crus are villages in northern Beaujolais with their own appellation: Saint-Amour, Juliénas, Chénas, Moulin-à-Vent, Fleurie, Chiroubles, Morgon, Régnié, Brouilly and Côte de Brouilly. The wines have more structure than regular Beaujolais and several of them can age.",
        },
        {
          question: "What is the Gang of Four?",
          answer:
            "A nickname for Marcel Lapierre, Jean Foillard, Guy Breton and Jean-Paul Thévenet, four growers in Morgon who in the 1980s began making wine with wild yeast and little or no sulphur, inspired by Jules Chauvet.",
        },
        {
          question: "Should Beaujolais be served chilled?",
          answer:
            "Yes, preferably lightly chilled, around 13 to 15 degrees. The lighter wines can be served cooler and work with everything from charcuterie to chicken. Morgon and Moulin-à-Vent can take a degree or two warmer.",
        },
      ],
    },
  },

  bourgogne: {
    sv: {
      h1: "Naturvin från Bourgogne",
      title: "Naturvin från Bourgogne | PACT Wines",
      metaDescription:
        "Naturvin från Bourgogne: Pinot Noir, Chardonnay och Aligoté från Côte d'Or, Yonne och Mâconnais. Hemleverans i Sverige.",
      description:
        "Bourgogne är Pinot Noir och Chardonnay på kalksten och märgel, med Aligoté som den tredje druvan. Hos PACT finns naturviner från Côte d'Or, Yonne och Mâconnais, från regionala appellationer till byviner.",
      contentHeading: "Om naturvin från Bourgogne",
      longDescription:
        "Bourgogne är uppdelat i små vingårdar som klassas efter läge: regionala appellationer, byviner, premier cru och grand cru. Samma druva kan ge mycket olika viner bara några hundra meter isär, och därför är jorden och läget det som står i centrum.\n\nI norr, i Yonne, ligger Chablis på kimmeridgisk kalk och märgel, och intill finns mindre kända områden som Épineuil och Irancy där det görs röda viner på Pinot Noir. Côte d'Or, med Côte de Nuits och Côte de Beaune, är regionens kärna. Längst i söder ligger Mâconnais, där Chardonnay dominerar och vinerna ofta är rundare. Aligoté, länge sedd som en enkel vardagsdruva, görs i dag av flera odlare med gamla stockar och blir både stram och komplex.\n\nProducenterna hos PACT i Bourgogne är Domaine Jean Fournier i Marsannay, Dominique Gruhier i Épineuil, Domaine Didon, Robert-Denogent i Mâconnais och Domaine Chapuis.",
      faq: [
        {
          question: "Vilka druvor odlas i Bourgogne?",
          answer:
            "Pinot Noir för röda viner och Chardonnay för vita. Aligoté är regionens andra vita druva. Gamay förekommer i liten skala, främst i blends som Coteaux Bourguignons.",
        },
        {
          question: "Vad är Bourgogne Aligoté?",
          answer:
            "En appellation för vita viner på druvan Aligoté. Vinerna har ofta hög syra och citrusfrukt. Från gamla stockar blir de mer koncentrerade och kan utvecklas några år i flaska.",
        },
        {
          question: "Vad betyder premier cru och grand cru?",
          answer:
            "Det är klassificeringar av enskilda vingårdar. Grand cru är de högst klassade lägena, premier cru nästa nivå. Under dem finns byviner, som Marsannay, och regionala appellationer, som Bourgogne Côte d'Or.",
        },
      ],
    },
    en: {
      h1: "Natural wine from Burgundy",
      title: "Natural Wine from Burgundy | PACT Wines",
      metaDescription:
        "Natural wine from Burgundy: Pinot Noir, Chardonnay and Aligoté from the Côte d'Or, Yonne and Mâconnais. Home delivery in Sweden.",
      description:
        "Burgundy is Pinot Noir and Chardonnay on limestone and marl, with Aligoté as the third grape. At PACT there are natural wines from the Côte d'Or, Yonne and Mâconnais, from regional appellations to village wines.",
      contentHeading: "About natural wine from Burgundy",
      longDescription:
        "Burgundy is divided into small vineyards classified by site: regional appellations, village wines, premier cru and grand cru. The same grape can give very different wines only a few hundred metres apart, which is why the soil and the site are at the centre.\n\nIn the north, in the Yonne, Chablis lies on Kimmeridgian limestone and marl, and next to it are lesser-known areas such as Épineuil and Irancy where red wines are made from Pinot Noir. The Côte d'Or, with the Côte de Nuits and Côte de Beaune, is the core of the region. Furthest south lies the Mâconnais, where Chardonnay dominates and the wines are often rounder. Aligoté, long seen as a simple everyday grape, is today made by several growers from old vines and becomes both taut and complex.\n\nThe producers at PACT in Burgundy are Domaine Jean Fournier in Marsannay, Dominique Gruhier in Épineuil, Domaine Didon, Robert-Denogent in the Mâconnais and Domaine Chapuis.",
      faq: [
        {
          question: "Which grapes are grown in Burgundy?",
          answer:
            "Pinot Noir for red wines and Chardonnay for whites. Aligoté is the region's second white grape. Gamay appears on a small scale, mainly in blends such as Coteaux Bourguignons.",
        },
        {
          question: "What is Bourgogne Aligoté?",
          answer:
            "An appellation for white wines from the Aligoté grape. The wines often have high acidity and citrus fruit. From old vines they become more concentrated and can develop for a few years in bottle.",
        },
        {
          question: "What do premier cru and grand cru mean?",
          answer:
            "They are classifications of individual vineyards. Grand cru are the highest-ranked sites, premier cru the next level. Below them are village wines, such as Marsannay, and regional appellations, such as Bourgogne Côte d'Or.",
        },
      ],
    },
  },

  jura: {
    sv: {
      h1: "Naturvin från Jura",
      title: "Naturvin från Jura | PACT Wines",
      metaDescription:
        "Naturvin från Jura: Poulsard, Trousseau, Savagnin och Chardonnay från märgeljord mellan Bourgogne och Schweiz. Hemleverans i Sverige.",
      description:
        "Jura är ett litet vinområde i bergen mellan Bourgogne och Schweiz, med egna druvor som Poulsard, Trousseau och Savagnin. Regionen har en lång tradition av vin med lite eller inget svavel och är i dag ett av naturvinets viktigaste områden.",
      contentHeading: "Om naturvin från Jura",
      longDescription:
        "Jura har länge legat utanför de stora vinregionernas fokus, men har haft stort inflytande på naturvinet. Pierre Overnoy i Pupillin gjorde vin utan tillsatt svavel redan från 1980-talet, och flera av dagens mest kända naturvinsodlare finns här, bland dem Jean-François Ganevat i södra Jura.\n\nJorden består till stor del av märgel, blå, grå och vit lera blandad med kalk, som ger viner med tydlig syra och sälta. De röda druvorna Poulsard och Trousseau ger ljusa, aromatiska viner med låg tannin. Savagnin och Chardonnay görs på två sätt: ouillé, där fatet fylls på så att vinet inte kommer i kontakt med luft, eller sous voile, där vinet lagras under ett jästtäcke. Den mest kända stilen sous voile är vin jaune.\n\nProducenterna hos PACT i Jura är Domaine des Marnes Blanches, Fumey-Chatelain, La Terre Penchée och Anne et Jean-François Ganevat.",
      faq: [
        {
          question: "Vad är vin jaune?",
          answer:
            "Ett vitt vin på Savagnin som lagras i minst fem år på fat utan påfyllning. Ett jästtäcke (voile) bildas på ytan och skyddar vinet, vilket ger toner av nötter och curry. Det säljs i den mindre flaskan clavelin.",
        },
        {
          question: "Vad betyder ouillé?",
          answer:
            "Ouillé betyder att fatet fylls på under lagringen så att vinet inte oxiderar. Det ger friska, rena vita viner, i motsats till stilen sous voile.",
        },
        {
          question: "Hur smakar Poulsard och Trousseau?",
          answer:
            "Poulsard ger mycket ljusa röda viner med röda bär och kryddor, nästan som en mörk rosé. Trousseau har mer färg och struktur, med mörkare bär och pepprig ton. Båda passar bra lätt kylda.",
        },
      ],
    },
    en: {
      h1: "Natural wine from the Jura",
      title: "Natural Wine from the Jura | PACT Wines",
      metaDescription:
        "Natural wine from the Jura: Poulsard, Trousseau, Savagnin and Chardonnay from marl soils between Burgundy and Switzerland. Home delivery in Sweden.",
      description:
        "The Jura is a small wine area in the mountains between Burgundy and Switzerland, with its own grapes such as Poulsard, Trousseau and Savagnin. The region has a long tradition of wine with little or no sulphur and is today one of the most important areas for natural wine.",
      contentHeading: "About natural wine from the Jura",
      longDescription:
        "The Jura has long been outside the focus of the big wine regions, but has had great influence on natural wine. Pierre Overnoy in Pupillin made wine without added sulphur from the 1980s, and several of today's best-known natural wine growers are found here, among them Jean-François Ganevat in the southern Jura.\n\nThe soil consists largely of marl, blue, grey and white clay mixed with limestone, which gives wines with clear acidity and salinity. The red grapes Poulsard and Trousseau give pale, aromatic wines with low tannin. Savagnin and Chardonnay are made in two ways: ouillé, where the barrel is topped up so the wine does not come into contact with air, or sous voile, where the wine is aged under a layer of yeast. The best-known sous voile style is vin jaune.\n\nThe producers at PACT in the Jura are Domaine des Marnes Blanches, Fumey-Chatelain, La Terre Penchée and Anne et Jean-François Ganevat.",
      faq: [
        {
          question: "What is vin jaune?",
          answer:
            "A white wine from Savagnin aged for at least five years in barrel without topping up. A layer of yeast (voile) forms on the surface and protects the wine, which gives notes of nuts and curry. It is sold in the smaller clavelin bottle.",
        },
        {
          question: "What does ouillé mean?",
          answer:
            "Ouillé means the barrel is topped up during ageing so the wine does not oxidise. It gives fresh, clean white wines, as opposed to the sous voile style.",
        },
        {
          question: "What do Poulsard and Trousseau taste like?",
          answer:
            "Poulsard gives very pale red wines with red berries and spice, almost like a dark rosé. Trousseau has more colour and structure, with darker berries and a peppery note. Both work well lightly chilled.",
        },
      ],
    },
  },

  rhone: {
    sv: {
      h1: "Naturvin från Rhône",
      title: "Naturvin från Rhône | PACT Wines",
      metaDescription:
        "Naturvin från Rhône: Syrah från granit i norr, Grenache-blends och Tavel i söder, och vin från Ardèche. Hemleverans i Sverige.",
      description:
        "Rhônedalen delas i två delar. I norr görs Syrah på branta granitsluttningar i Saint-Joseph och Crozes-Hermitage. I söder dominerar Grenache i blend med Syrah och Mourvèdre, i appellationer som Gigondas och Tavel. Väster om floden ligger Ardèche, där många naturvinsodlare arbetar under Vin de France.",
      contentHeading: "Om naturvin från Rhône",
      longDescription:
        "Norra Rhône är smalt och brant. Vingårdarna ligger på terrasser av granit längs floden, och den enda röda druvan i appellationerna är Syrah, ibland med en liten andel vita druvor. Vinerna är mörka, peppriga och strama. De vita druvorna är Viognier, Marsanne och Roussanne.\n\nSödra Rhône är bredare och varmare, med småsten, sand och lera. Här blandas Grenache med Syrah, Mourvèdre, Cinsault och Carignan, och vinerna blir generösare och kryddigare. Tavel är en av få appellationer i Frankrike som bara får göra rosé. I Ardèche, på västra sidan av floden, arbetar flera odlare utanför appellationssystemet och säljer sina viner som Vin de France.\n\nProducenterna hos PACT i Rhône är Alain Graillot, La Ferme des Sept Lunes, Domaine Romaneaux-Destezet, Mas de Libian, Les Deux Terres, Domaine Gour de Chaulé och Romain Le Bars (Pousse Cailloux).",
      faq: [
        {
          question: "Vad är skillnaden mellan norra och södra Rhône?",
          answer:
            "Norra Rhône har branta granitsluttningar och röda viner på bara Syrah. Södra Rhône är varmare och flackare, och vinerna är oftast blends där Grenache dominerar.",
        },
        {
          question: "Vad är Tavel?",
          answer:
            "En appellation i södra Rhône som bara får göra rosé. Vinerna är mörkare och fylligare än de flesta roséer, och görs främst på Grenache och Cinsault. De fungerar som matvin året om.",
        },
        {
          question: "Varför står det Vin de France på många viner från Rhône?",
          answer:
            "Vin de France är den bredaste kategorin, utan krav på druvor eller metoder inom en appellation. Många naturvinsodlare, särskilt i Ardèche, väljer den för att kunna arbeta friare eller för att deras vingårdar ligger utanför en appellation.",
        },
      ],
    },
    en: {
      h1: "Natural wine from the Rhône Valley",
      title: "Natural Wine from the Rhône Valley | PACT Wines",
      metaDescription:
        "Natural wine from the Rhône Valley: Syrah from granite in the north, Grenache blends and Tavel in the south, and wine from the Ardèche. Home delivery in Sweden.",
      description:
        "The Rhône Valley is divided into two parts. In the north Syrah is made on steep granite slopes in Saint-Joseph and Crozes-Hermitage. In the south Grenache dominates in blends with Syrah and Mourvèdre, in appellations such as Gigondas and Tavel. West of the river lies the Ardèche, where many natural wine growers work under Vin de France.",
      contentHeading: "About natural wine from the Rhône Valley",
      longDescription:
        "The northern Rhône is narrow and steep. The vineyards sit on granite terraces along the river, and the only red grape in the appellations is Syrah, sometimes with a small share of white grapes. The wines are dark, peppery and taut. The white grapes are Viognier, Marsanne and Roussanne.\n\nThe southern Rhône is wider and warmer, with pebbles, sand and clay. Here Grenache is blended with Syrah, Mourvèdre, Cinsault and Carignan, and the wines become more generous and spicier. Tavel is one of the few appellations in France that may only make rosé. In the Ardèche, on the west side of the river, several growers work outside the appellation system and sell their wines as Vin de France.\n\nThe producers at PACT in the Rhône are Alain Graillot, La Ferme des Sept Lunes, Domaine Romaneaux-Destezet, Mas de Libian, Les Deux Terres, Domaine Gour de Chaulé and Romain Le Bars (Pousse Cailloux).",
      faq: [
        {
          question: "What is the difference between the northern and southern Rhône?",
          answer:
            "The northern Rhône has steep granite slopes and red wines from Syrah only. The southern Rhône is warmer and flatter, and the wines are usually blends where Grenache dominates.",
        },
        {
          question: "What is Tavel?",
          answer:
            "An appellation in the southern Rhône that may only make rosé. The wines are darker and fuller than most rosés, and are made mainly from Grenache and Cinsault. They work as food wines all year round.",
        },
        {
          question: "Why do many wines from the Rhône say Vin de France?",
          answer:
            "Vin de France is the broadest category, with no requirements on grapes or methods within an appellation. Many natural wine growers, especially in the Ardèche, choose it to be able to work more freely or because their vineyards lie outside an appellation.",
        },
      ],
    },
  },

  roussillon: {
    sv: {
      h1: "Naturvin från Roussillon",
      title: "Naturvin från Roussillon | PACT Wines",
      metaDescription:
        "Naturvin från Roussillon: Grenache, Macabeu och Muscat från skiffer, kalk och granit vid Pyrenéerna. Hemleverans i Sverige.",
      description:
        "Roussillon är Frankrikes sydligaste vinområde, mellan Pyrenéerna, Medelhavet och den spanska gränsen. Varmt och torrt klimat, blåsten tramontane och jordar av skiffer, kalk och granit ger koncentrerade viner med tydlig mineralitet.",
      contentHeading: "Om naturvin från Roussillon",
      longDescription:
        "Roussillon har katalansk kultur och en lång tradition av söta förstärkta viner, vins doux naturels, i Banyuls, Maury och Rivesaltes. De senaste decennierna har allt fler odlare börjat göra torra viner, och Agly-dalen, med byar som Calce, har blivit ett av Frankrikes mest kända områden för naturvin.\n\nJordarna skiftar på korta avstånd: svart skiffer kring Maury, kalksten i Calce och granit och gnejs på andra håll. Grenache finns i tre färger, Noir, Blanc och Gris, och är regionens viktigaste druva. Till det kommer Carignan, Syrah, Mourvèdre, Macabeu och Muscat. Många viner säljs som IGP Côtes Catalanes eller Vin de France.\n\nProducenterna hos PACT i Roussillon är Domaine Gauby och Domaine Padié i Calce och Domaine Danjou-Banessy i Espira-de-l'Agly.",
      faq: [
        {
          question: "Vad är skillnaden mellan Roussillon och Languedoc?",
          answer:
            "Regionerna ligger bredvid varandra och slås ofta ihop som Languedoc-Roussillon. Roussillon ligger längre söderut vid Pyrenéerna, har katalansk kultur och är varmare och torrare. Grenache spelar en större roll, och traditionen av söta vins doux naturels är starkare.",
        },
        {
          question: "Vad är Côtes Catalanes?",
          answer:
            "IGP Côtes Catalanes är en regional beteckning för viner från Roussillon. Den ger odlarna större frihet i druvval än appellationerna, och många torra naturviner från regionen säljs under den.",
        },
        {
          question: "Vad är tramontane?",
          answer:
            "En kall och torr nordvästlig vind som blåser ner från bergen. Den håller vingårdarna torra och friska, vilket minskar risken för svamp och gör det lättare att odla utan kemiska bekämpningsmedel.",
        },
      ],
    },
    en: {
      h1: "Natural wine from Roussillon",
      title: "Natural Wine from Roussillon | PACT Wines",
      metaDescription:
        "Natural wine from Roussillon: Grenache, Macabeu and Muscat from schist, limestone and granite by the Pyrenees. Home delivery in Sweden.",
      description:
        "Roussillon is France's southernmost wine area, between the Pyrenees, the Mediterranean and the Spanish border. A warm and dry climate, the tramontane wind and soils of schist, limestone and granite give concentrated wines with clear minerality.",
      contentHeading: "About natural wine from Roussillon",
      longDescription:
        "Roussillon has a Catalan culture and a long tradition of sweet fortified wines, vins doux naturels, in Banyuls, Maury and Rivesaltes. In recent decades more and more growers have started making dry wines, and the Agly valley, with villages such as Calce, has become one of France's best-known areas for natural wine.\n\nThe soils change over short distances: black schist around Maury, limestone in Calce and granite and gneiss elsewhere. Grenache comes in three colours, Noir, Blanc and Gris, and is the region's most important grape. In addition there are Carignan, Syrah, Mourvèdre, Macabeu and Muscat. Many wines are sold as IGP Côtes Catalanes or Vin de France.\n\nThe producers at PACT in Roussillon are Domaine Gauby and Domaine Padié in Calce and Domaine Danjou-Banessy in Espira-de-l'Agly.",
      faq: [
        {
          question: "What is the difference between Roussillon and the Languedoc?",
          answer:
            "The regions lie next to each other and are often grouped together as Languedoc-Roussillon. Roussillon lies further south by the Pyrenees, has a Catalan culture and is warmer and drier. Grenache plays a larger role, and the tradition of sweet vins doux naturels is stronger.",
        },
        {
          question: "What is Côtes Catalanes?",
          answer:
            "IGP Côtes Catalanes is a regional designation for wines from Roussillon. It gives growers more freedom in choice of grapes than the appellations, and many dry natural wines from the region are sold under it.",
        },
        {
          question: "What is the tramontane?",
          answer:
            "A cold and dry northwesterly wind that blows down from the mountains. It keeps the vineyards dry and fresh, which reduces the risk of fungus and makes it easier to farm without chemical pesticides.",
        },
      ],
    },
  },

  "sud-ouest": {
    sv: {
      h1: "Naturvin från Sydvästra Frankrike",
      title: "Naturvin från Sydvästra Frankrike (Sud-Ouest) | PACT Wines",
      metaDescription:
        "Naturvin från Sydvästra Frankrike: Malbec från Cahors, Manseng från Jurançon och lokala druvor från Sud-Ouest. Hemleverans i Sverige.",
      description:
        "Sud-Ouest är samlingsnamnet för vinområdena mellan Bordeaux och Pyrenéerna. Här finns många lokala druvor som knappt odlas någon annanstans, från Malbec i Cahors till Gros och Petit Manseng i Jurançon.",
      contentHeading: "Om naturvin från Sydvästra Frankrike",
      longDescription:
        "Sydvästra Frankrike är inte en sammanhängande region utan en rad mindre vinområden med egna traditioner, bland dem Cahors, Gaillac, Marcillac, Madiran, Jurançon och Côtes du Marmandais. Det gemensamma är ett stort antal lokala druvor och en stark tradition av familjeodling.\n\nI Cahors, längs floden Lot, är Malbec, här kallad Côt, huvuddruvan. Vinerna är mörka och kraftiga med fasta tanniner, och kalkplatåerna ger mer stramhet än de lägre terrasserna. I Jurançon vid Pyrenéerna görs vita viner på Gros Manseng, Petit Manseng och Petit Courbu, både torra och söta, med hög syra. Längre norrut odlas druvor som Fer Servadou, Négrette, Abouriou och Mauzac.\n\nProducenterna hos PACT i Sydvästra Frankrike är Domaine Cosse Maisonneuve i Cahors och Domaine Camin Larredya i Jurançon.",
      faq: [
        {
          question: "Vad är Cahors?",
          answer:
            "En appellation längs floden Lot där röda viner görs på minst 70 procent Malbec (Côt). Vinerna är mörka och tanninrika och utvecklas ofta väl med några års lagring.",
        },
        {
          question: "Vad är Jurançon sec?",
          answer:
            "Torrt vitt vin från Jurançon vid Pyrenéerna, gjort på Gros Manseng, Petit Manseng och ibland Petit Courbu. Vinerna har hög syra och tropisk frukt. Jurançon utan tillägget sec är sött.",
        },
        {
          question: "Är Sud-Ouest samma sak som Bordeaux?",
          answer:
            "Nej. Bordeaux räknas som en egen region. Sud-Ouest omfattar områdena runt och söder om Bordeaux, med andra druvor och traditioner.",
        },
      ],
    },
    en: {
      h1: "Natural wine from Southwest France",
      title: "Natural Wine from Southwest France | PACT Wines",
      metaDescription:
        "Natural wine from Southwest France: Malbec from Cahors, Manseng from Jurançon and local grapes from the Sud-Ouest. Home delivery in Sweden.",
      description:
        "Sud-Ouest is the collective name for the wine areas between Bordeaux and the Pyrenees. Here are many local grapes that are hardly grown anywhere else, from Malbec in Cahors to Gros and Petit Manseng in Jurançon.",
      contentHeading: "About natural wine from Southwest France",
      longDescription:
        "Southwest France is not a continuous region but a series of smaller wine areas with their own traditions, among them Cahors, Gaillac, Marcillac, Madiran, Jurançon and Côtes du Marmandais. What they share is a large number of local grapes and a strong tradition of family farming.\n\nIn Cahors, along the river Lot, Malbec, here called Côt, is the main grape. The wines are dark and powerful with firm tannins, and the limestone plateaus give more tautness than the lower terraces. In Jurançon by the Pyrenees white wines are made from Gros Manseng, Petit Manseng and Petit Courbu, both dry and sweet, with high acidity. Further north grapes such as Fer Servadou, Négrette, Abouriou and Mauzac are grown.\n\nThe producers at PACT in Southwest France are Domaine Cosse Maisonneuve in Cahors and Domaine Camin Larredya in Jurançon.",
      faq: [
        {
          question: "What is Cahors?",
          answer:
            "An appellation along the river Lot where red wines are made from at least 70 percent Malbec (Côt). The wines are dark and tannic and often develop well with a few years of ageing.",
        },
        {
          question: "What is Jurançon sec?",
          answer:
            "Dry white wine from Jurançon by the Pyrenees, made from Gros Manseng, Petit Manseng and sometimes Petit Courbu. The wines have high acidity and tropical fruit. Jurançon without the addition sec is sweet.",
        },
        {
          question: "Is Sud-Ouest the same as Bordeaux?",
          answer:
            "No. Bordeaux counts as a separate region. Sud-Ouest covers the areas around and south of Bordeaux, with other grapes and traditions.",
        },
      ],
    },
  },
};
