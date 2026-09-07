// TODO: Replace Swedish content with English legal copy when available.
// Do not ship half-translated legal text. Indexed Swedish lives at /cookies.

import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import CookiepolicyContent from "@/content/legal/cookiepolicy";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

const TITLE = "Cookie policy";
const DESCRIPTION = "Cookies and similar technologies on pactwines.com.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${config.baseUrl}/cookie-policy`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    robots: { index: false, follow: true },
    alternates: {
      canonical,
      languages: {
        en: canonical,
        sv: `${config.baseUrl}/cookies`,
        "x-default": `${config.baseUrl}/cookies`,
      },
    },
  };
}

export default function CookiePolicyPage() {
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
