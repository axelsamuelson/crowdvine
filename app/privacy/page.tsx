// TODO: Replace Swedish content with English legal copy when available.
// Do not ship half-translated legal text. Indexed Swedish lives at /integritetspolicy.

import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import IntegritetspolicyContent from "@/content/legal/integritetspolicy";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const dynamic = "force-static";

const TITLE = "Privacy policy";
const DESCRIPTION = "How PACT processes your personal data.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${PACT_PUBLIC_ORIGIN}/privacy`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    // Body is still Swedish — keep URL for locale routing but do not index.
    robots: { index: false, follow: true },
    alternates: {
      canonical,
      // Point x-default at the indexable SV page until EN copy ships.
      languages: {
        en: canonical,
        sv: `${PACT_PUBLIC_ORIGIN}/integritetspolicy`,
        "x-default": `${PACT_PUBLIC_ORIGIN}/integritetspolicy`,
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
