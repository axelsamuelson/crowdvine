import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import KopvillkorContent from "@/content/legal/kopvillkor";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const dynamic = "force-static";

const TITLE = "Köpvillkor";
const DESCRIPTION =
  "Villkor för köp av vin på PACT. Åldersgräns, betalning och leverans.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${PACT_PUBLIC_ORIGIN}/villkor`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
      // EN /terms is still Swedish body + noindex — do not advertise it as an equivalent.
      languages: {
        sv: canonical,
        "x-default": canonical,
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
