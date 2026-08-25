import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import CookiepolicyContent from "@/content/legal/cookiepolicy";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-static";

const TITLE = "Cookiepolicy";
const DESCRIPTION = "Cookies och liknande tekniker på pactwines.com.";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  const canonical = `${config.baseUrl}/cookies`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical,
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
