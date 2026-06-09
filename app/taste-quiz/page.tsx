import { getSiteConfig } from "@/lib/site-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}/taste-quiz`;

  return {
    title: {
      absolute: "Hitta ditt vin — Smakprofil & vinrekommendationer | PACT Wines",
    },
    description:
      "Svara på 5 frågor om tillfälle, smak och budget — vi matchar dig mot rätt naturvin från Languedoc.",
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: "Hitta ditt vin på 2 minuter | PACT Wines",
      description:
        "5 frågor. Personliga vinrekommendationer från Languedoc.",
      url: pageUrl,
    },
  };
}

export default function TasteQuizPage() {
  redirect("/#taste-quiz");
}
