import type { Metadata } from "next";

import { whatIsPetNatArticle } from "@/lib/guides/articles/what-is-pet-nat";
import { GuideTaggedWineBlock } from "@/lib/guides/guide-tagged-wine-block";
import {
  buildArticleGuideMetadata,
  renderArticleGuidePage,
} from "@/lib/guides/render-article-guide";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildArticleGuideMetadata(whatIsPetNatArticle, "sv");
}

export default async function VadArPetNatGuidePage() {
  const petNatWines = await GuideTaggedWineBlock({
    tag: "pet_nat",
    heading: "Pet nat att köpa hos PACT",
    intro:
      "Pet nat som vi köper direkt från producenterna, med leverans i hela Sverige på delad pall eller direkt hem.",
    link: { href: "/vin/pet-nat", label: "Se alla pet nat →" },
    locale: "sv",
  });

  return renderArticleGuidePage(whatIsPetNatArticle, "sv", {
    afterSections: petNatWines,
  });
}
