import type { Metadata } from "next";
import { HiwHeroSection } from "@/components/how-it-works/hiw-hero-section";
import { HiwStatsSection } from "@/components/how-it-works/hiw-stats-section";
import { HiwConsolidationSection } from "@/components/how-it-works/hiw-consolidation-section";
import { HiwAdditivesSection } from "@/components/how-it-works/hiw-additives-section";
import { HiwMoneySection } from "@/components/how-it-works/hiw-money-section";
import { HiwMovementSection } from "@/components/how-it-works/hiw-movement-section";
import { HiwPactSection } from "@/components/how-it-works/hiw-pact-section";
import "./how-it-works.css";

export const metadata: Metadata = {
  title: "Hur fungerar PACT? Direktimport av vin från producent till konsument",
  description:
    "PACT samlar beställningar tills en pall är full. Producenten skickar direkt från Languedoc till Stockholm — utan importör, grossist eller Systembolaget.",
  openGraph: {
    title: "Hur fungerar PACT? Direktimport av vin från producent till konsument",
    description:
      "PACT samlar beställningar tills en pall är full. Producenten skickar direkt från Languedoc till Stockholm — utan importör, grossist eller Systembolaget.",
    type: "website",
  },
};

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
