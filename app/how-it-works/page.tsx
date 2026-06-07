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
  title: "Så fungerar det",
  description:
    "Varför vin är mer än en dryck — och hur PACT löser logistikproblemet mellan producent och dig.",
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
