import type { Metadata } from "next";
import { HiwHeroSection } from "@/components/how-it-works/hiw-hero-section";
import { HiwStatsSection } from "@/components/how-it-works/hiw-stats-section";
import { HiwConsolidationSection } from "@/components/how-it-works/hiw-consolidation-section";
import { HiwAdditivesSection } from "@/components/how-it-works/hiw-additives-section";
import { HiwMoneySection } from "@/components/how-it-works/hiw-money-section";
import { HiwMovementSection } from "@/components/how-it-works/hiw-movement-section";
import { HiwPactSection } from "@/components/how-it-works/hiw-pact-section";
import { getSiteConfig } from "@/lib/site-config";
import "./how-it-works.css";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}/how-it-works`;
  const title =
    "Hur fungerar PACT Wines? Direktimport av vin från producent till konsument";
  const description =
    "PACT samlar beställningar tills en pall är full. Producenten skickar direkt från Languedoc till Stockholm — utan importör, grossist eller Systembolaget.";

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
      languages: {
        sv: "https://pactwines.com/how-it-works",
        en: "https://pactwines.com/how-it-works",
        "x-default": "https://pactwines.com/how-it-works",
      },
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: "website",
    },
  };
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-stone-900">
      <HiwHeroSection />
      <HiwStatsSection />
      <HiwConsolidationSection />
      <HiwAdditivesSection />
      <HiwMoneySection />
      <HiwMovementSection />
      <HiwPactSection />
    </div>
  );
}
