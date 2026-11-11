import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import KopvillkorEnContent, {
  KOPVILLKOR_EN_TOC,
} from "@/content/legal/kopvillkor-en";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const dynamic = "force-static";

const TITLE = "Terms of purchase";
const DESCRIPTION =
  "Terms for purchasing wine on PACT. Age restriction, payment and delivery.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${PACT_PUBLIC_ORIGIN}/terms`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
      languages: {
        en: canonical,
        sv: `${PACT_PUBLIC_ORIGIN}/villkor`,
        "x-default": `${PACT_PUBLIC_ORIGIN}/villkor`,
      },
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
      toc={KOPVILLKOR_EN_TOC}
      locale="en"
    >
      <KopvillkorEnContent />
    </LegalPageLayout>
  );
}
