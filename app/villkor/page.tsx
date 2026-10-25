import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import KopvillkorContent from "@/content/legal/kopvillkor";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const dynamic = "force-static";

const TITLE = "Köpvillkor";
const DESCRIPTION =
  "Villkor för köp av vin på PACT. Åldersgräns, betalning, leverans, ångerrätt och reklamation.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${PACT_PUBLIC_ORIGIN}/villkor`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
      languages: {
        sv: canonical,
        en: `${PACT_PUBLIC_ORIGIN}/terms`,
        "x-default": `${PACT_PUBLIC_ORIGIN}/terms`,
      },
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
