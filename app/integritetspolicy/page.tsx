import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import IntegritetspolicyContent from "@/content/legal/integritetspolicy";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const dynamic = "force-static";

const TITLE = "Integritetspolicy";
const DESCRIPTION = "Så behandlar PACT dina personuppgifter.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${PACT_PUBLIC_ORIGIN}/integritetspolicy`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
      languages: {
        sv: canonical,
        en: `${PACT_PUBLIC_ORIGIN}/privacy`,
        "x-default": `${PACT_PUBLIC_ORIGIN}/privacy`,
      },
    },
  };
}

export default function IntegritetspolicyPage() {
  const version = LEGAL_VERSIONS.privacy;

  return (
    <LegalPageLayout
      title={TITLE}
      lastUpdated={version}
      version={version}
    >
      <IntegritetspolicyContent />
    </LegalPageLayout>
  );
}
