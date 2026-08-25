import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import KopvillkorContent from "@/content/legal/kopvillkor";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

const TITLE = "Köpvillkor";
const DESCRIPTION =
  "Villkor för köp av vin på PACT. Åldersgräns, betalning, leverans, ångerrätt och reklamation.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${config.baseUrl}/villkor`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
    },
  };
}

export default function VillkorPage() {
  const version = LEGAL_VERSIONS.terms;

  return (
    <LegalPageLayout
      title={TITLE}
      lastUpdated={version}
      version={version}
    >
      <KopvillkorContent />
    </LegalPageLayout>
  );
}
