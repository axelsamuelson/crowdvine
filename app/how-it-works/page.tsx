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

const HOW_IT_WORKS_TITLE =
  "Hur fungerar PACT Wines? Direktimport av vin från producent till konsument";
const HOW_IT_WORKS_DESCRIPTION =
  "PACT samlar beställningar tills en pall är full. Producenten skickar direkt från Languedoc till Stockholm — utan importör, grossist eller Systembolaget.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}/how-it-works`;

  return {
    title: HOW_IT_WORKS_TITLE,
    description: HOW_IT_WORKS_DESCRIPTION,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: HOW_IT_WORKS_TITLE,
      description: HOW_IT_WORKS_DESCRIPTION,
      url: pageUrl,
      type: "website",
    },
  };
}

export default async function HowItWorksPage() {
  const config = await getSiteConfig();
  const pageUrl = `${config.baseUrl}/how-it-works`;

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: HOW_IT_WORKS_TITLE,
    description: HOW_IT_WORKS_DESCRIPTION,
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: config.name,
      url: config.baseUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageJsonLd),
        }}
      />
    <div className="min-h-screen bg-white font-sans text-stone-900">
      <HiwHeroSection />
      <HiwStatsSection />
      <HiwConsolidationSection />
      <HiwAdditivesSection />
      <HiwMoneySection />
      <HiwMovementSection />
      <HiwPactSection />
    </div>
    </>
  );
}
