import type { GuideArticleContent } from "@/lib/guides/guide-types";
import { beaujolaisNaturalWineArticle } from "@/lib/guides/articles/beaujolais-natural-wine";
import { gangOfFourWineArticle } from "@/lib/guides/articles/gang-of-four-wine";
import { georgiaNaturalWineArticle } from "@/lib/guides/articles/georgia-natural-wine";
import { guyBretonArticle } from "@/lib/guides/articles/guy-breton";
import { jacquesSelosseArticle } from "@/lib/guides/articles/jacques-selosse";
import { jeanFoillardArticle } from "@/lib/guides/articles/jean-foillard";
import { jeanFrancoisGanevatArticle } from "@/lib/guides/articles/jean-francois-ganevat";
import { jeanPaulThevenetArticle } from "@/lib/guides/articles/jean-paul-thevenet";
import { joskoGravnerArticle } from "@/lib/guides/articles/josko-gravner";
import { juraNaturalWineArticle } from "@/lib/guides/articles/jura-natural-wine";
import { marcelLapierreArticle } from "@/lib/guides/articles/marcel-lapierre";
import { pierreOvernoyArticle } from "@/lib/guides/articles/pierre-overnoy";
import { radikonArticle } from "@/lib/guides/articles/radikon";
import { thierryAllemandArticle } from "@/lib/guides/articles/thierry-allemand";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { whatIsOrangeWineArticle } from "@/lib/guides/articles/what-is-orange-wine";
import { whatIsRedNaturalWineArticle } from "@/lib/guides/articles/what-is-red-natural-wine";
import { whatIsWhiteNaturalWineArticle } from "@/lib/guides/articles/what-is-white-natural-wine";

/**
 * Registry of bilingual article guides.
 * Sitemap + future hub helpers iterate this list.
 * Add new articles here when they ship in both locales.
 */
export const BILINGUAL_ARTICLE_GUIDES: readonly GuideArticleContent[] = [
  pierreOvernoyArticle,
  thierryAllemandArticle,
  jeanFrancoisGanevatArticle,
  jeanFoillardArticle,
  marcelLapierreArticle,
  guyBretonArticle,
  jeanPaulThevenetArticle,
  gangOfFourWineArticle,
  radikonArticle,
  jacquesSelosseArticle,
  joskoGravnerArticle,
  juraNaturalWineArticle,
  beaujolaisNaturalWineArticle,
  georgiaNaturalWineArticle,
  whatIsOrangeWineArticle,
  whatIsNaturalWineArticle,
  whatIsRedNaturalWineArticle,
  whatIsWhiteNaturalWineArticle,
];
