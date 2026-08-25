import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import IntegritetspolicyContent from "@/content/legal/integritetspolicy";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

const TITLE = "Integritetspolicy";
const DESCRIPTION = "Så behandlar PACT dina personuppgifter.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${config.baseUrl}/integritetspolicy`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
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
