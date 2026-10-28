import type { Metadata } from "next";

import { newNaturalWinesSystembolagetArticle } from "@/lib/guides/articles/new-natural-wines-systembolaget";
import {
  buildSystembolagetReleasesMetadata,
  renderSystembolagetReleasesPage,
} from "@/lib/guides/systembolaget-releases";

export const revalidate = 600;

export function generateMetadata(): Promise<Metadata> {
  return buildSystembolagetReleasesMetadata(
    newNaturalWinesSystembolagetArticle,
    "sv",
  );
}

export default function NyaNaturvinerSystembolagetGuidePage() {
  return renderSystembolagetReleasesPage(
    newNaturalWinesSystembolagetArticle,
    "sv",
  );
}
