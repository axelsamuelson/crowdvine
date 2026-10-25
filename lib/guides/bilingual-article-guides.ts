import type { GuideArticleContent } from "@/lib/guides/guide-types";
import { beaujolaisNaturalWineArticle } from "@/lib/guides/articles/beaujolais-natural-wine";
import { bestGlouGlouWinesSystembolagetArticle } from "@/lib/guides/articles/best-glou-glou-wines-systembolaget";
import { bestPetNatWinesSystembolagetArticle } from "@/lib/guides/articles/best-pet-nat-wines-systembolaget";
import { bestNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-natural-wines-systembolaget";
import { bestNaturalWinesUnder200SystembolagetArticle } from "@/lib/guides/articles/best-natural-wines-under-200-systembolaget";
import { bestOrangeNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-orange-natural-wines-systembolaget";
import { bestRedNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-red-natural-wines-systembolaget";
import { bestSparklingNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-sparkling-natural-wines-systembolaget";
import { bestRoseNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-rose-natural-wines-systembolaget";
import { bestWhiteNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/best-white-natural-wines-systembolaget";
import { gangOfFourWineArticle } from "@/lib/guides/articles/gang-of-four-wine";
import { georgiaNaturalWineArticle } from "@/lib/guides/articles/georgia-natural-wine";
import { guyBretonArticle } from "@/lib/guides/articles/guy-breton";
import { jacquesSelosseArticle } from "@/lib/guides/articles/jacques-selosse";
import { jeanFoillardArticle } from "@/lib/guides/articles/jean-foillard";
import { jeanFrancoisGanevatArticle } from "@/lib/guides/articles/jean-francois-ganevat";
import { jeanPaulThevenetArticle } from "@/lib/guides/articles/jean-paul-thevenet";
import { joskoGravnerArticle } from "@/lib/guides/articles/josko-gravner";
import { juraNaturalWineArticle } from "@/lib/guides/articles/jura-natural-wine";
import { languedocNaturalWineArticle } from "@/lib/guides/articles/languedoc-natural-wine";
import { marcelLapierreArticle } from "@/lib/guides/articles/marcel-lapierre";
import { pierreOvernoyArticle } from "@/lib/guides/articles/pierre-overnoy";
import { radikonArticle } from "@/lib/guides/articles/radikon";
import { thierryAllemandArticle } from "@/lib/guides/articles/thierry-allemand";
import { whatIsNaturalWineArticle } from "@/lib/guides/articles/what-is-natural-wine";
import { whatIsOrangeWineArticle } from "@/lib/guides/articles/what-is-orange-wine";
import { whatIsPetNatArticle } from "@/lib/guides/articles/what-is-pet-nat";
import { buyNaturalWineOnlineSwedenArticle } from "@/lib/guides/articles/buy-natural-wine-online-sweden";
import { naturalWineHomeDeliveryArticle } from "@/lib/guides/articles/natural-wine-home-delivery";

/**
 * Registry of bilingual article guides.
 * Sitemap and hub helpers iterate published entries only
 * (`published !== false`). Add new articles here when both locales exist.
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
  languedocNaturalWineArticle,
  beaujolaisNaturalWineArticle,
  georgiaNaturalWineArticle,
  whatIsOrangeWineArticle,
  whatIsNaturalWineArticle,
  buyNaturalWineOnlineSwedenArticle,
  naturalWineHomeDeliveryArticle,
  bestNaturalWinesSystembolagetArticle,
  bestRedNaturalWinesSystembolagetArticle,
  bestWhiteNaturalWinesSystembolagetArticle,
  bestSparklingNaturalWinesSystembolagetArticle,
  bestRoseNaturalWinesSystembolagetArticle,
  bestOrangeNaturalWinesSystembolagetArticle,
  bestNaturalWinesUnder200SystembolagetArticle,
  bestGlouGlouWinesSystembolagetArticle,
  bestPetNatWinesSystembolagetArticle,
  whatIsPetNatArticle,
];
