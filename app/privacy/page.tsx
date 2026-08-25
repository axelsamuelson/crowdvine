// TODO: Replace Swedish content with English legal copy when available.
// Do not ship half-translated legal text.

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
    alternates: {
      canonical,
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
