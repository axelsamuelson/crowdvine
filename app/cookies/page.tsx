import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import CookiepolicyContent from "@/content/legal/cookiepolicy";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

export const dynamic = "force-static";

const TITLE = "Cookiepolicy";
const DESCRIPTION = "Cookies och liknande tekniker på pactwines.com.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${PACT_PUBLIC_ORIGIN}/cookies`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
      // EN /cookie-policy is still Swedish body + noindex — do not advertise it as an equivalent.
      languages: {
        sv: canonical,
        "x-default": canonical,
      },
    },
  };
}

export default function CookiesPage() {
  const version = LEGAL_VERSIONS.cookies;

  return (
    <LegalPageLayout
      title={TITLE}
      lastUpdated={version}
      version={version}
    >
      <CookiepolicyContent />
    </LegalPageLayout>
  );
}
