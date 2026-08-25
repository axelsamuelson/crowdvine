// TODO: Replace Swedish content with English legal copy when available.
// Do not ship half-translated legal text.

import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import KopvillkorContent from "@/content/legal/kopvillkor";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

const TITLE = "Terms of purchase";
const DESCRIPTION =
  "Terms for purchasing wine on PACT. Age restriction, payment, delivery, right of withdrawal and complaints.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${config.baseUrl}/terms`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
    },
  };
}

export default function TermsPage() {
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
