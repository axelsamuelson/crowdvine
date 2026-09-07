// TODO: Replace Swedish content with English legal copy when available.
// Do not ship half-translated legal text. Indexed Swedish lives at /integritetspolicy.

import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import IntegritetspolicyContent from "@/content/legal/integritetspolicy";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

const TITLE = "Privacy policy";
const DESCRIPTION = "How PACT processes your personal data.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${config.baseUrl}/privacy`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    // Body is still Swedish — keep URL for hreflang but do not index.
    robots: { index: false, follow: true },
    alternates: {
      canonical,
      languages: {
        en: canonical,
        sv: `${config.baseUrl}/integritetspolicy`,
        "x-default": `${config.baseUrl}/integritetspolicy`,
      },
    },
  };
}

export default function PrivacyPage() {
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
