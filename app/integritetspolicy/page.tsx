import type { Metadata } from "next";

import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import DirtyWineIntegritetspolicyContent from "@/content/legal/integritetspolicy-dirtywine";
import IntegritetspolicyContent from "@/content/legal/integritetspolicy";
import { isDirtywineHost } from "@/lib/b2b-site";
import { getRequestHostFromHeaders } from "@/lib/b2b-site-server";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { getSiteConfig } from "@/lib/site-config-server";
import { PACT_PUBLIC_ORIGIN } from "@/lib/i18n/localized-routes";

/** Host-aware: Dirty Wine vs PACT copy (also respects localhost ?b2b=1). */
export const dynamic = "force-dynamic";

const PACT_TITLE = "Integritetspolicy";
const PACT_DESCRIPTION = "Så behandlar PACT dina personuppgifter.";

const DIRTY_TITLE = "Integritetspolicy";
const DIRTY_DESCRIPTION =
  "Så behandlar Dirty Wine personuppgifter om kontaktpersoner hos restauranger och barer.";
const DIRTY_VERSION = "2026-10-31";
const DIRTY_LAST_UPDATED = "31 oktober 2026";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveIsDirtywine(
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
): Promise<boolean> {
  const host = await getRequestHostFromHeaders();
  const raw = searchParams ? await searchParams : undefined;
  const b2b = raw?.b2b;
  const params = {
    get: (key: string) => {
      if (key !== "b2b") return null;
      if (Array.isArray(b2b)) return b2b[0] ?? null;
      return typeof b2b === "string" ? b2b : null;
    },
  };
  return isDirtywineHost(host, params);
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const [config, isDirtywine] = await Promise.all([
    getSiteConfig(),
    resolveIsDirtywine(searchParams),
  ]);

  if (isDirtywine) {
    const canonical = `${config.baseUrl}/integritetspolicy`;
    return {
      title: DIRTY_TITLE,
      description: DIRTY_DESCRIPTION,
      alternates: {
        canonical,
        languages: {
          sv: canonical,
          "x-default": canonical,
        },
      },
    };
  }

  const canonical = `${PACT_PUBLIC_ORIGIN}/integritetspolicy`;
  return {
    title: PACT_TITLE,
    description: PACT_DESCRIPTION,
    alternates: {
      canonical,
      // EN /privacy is still Swedish body + noindex — do not advertise it as an equivalent.
      languages: {
        sv: canonical,
        "x-default": canonical,
      },
    },
  };
}

export default async function IntegritetspolicyPage({ searchParams }: PageProps) {
  const isDirtywine = await resolveIsDirtywine(searchParams);

  if (isDirtywine) {
    const legalAddress = process.env.DIRTYWINE_LEGAL_ADDRESS?.trim() || null;
    return (
      <LegalPageLayout
        title={DIRTY_TITLE}
        lastUpdated={DIRTY_LAST_UPDATED}
        version={DIRTY_VERSION}
      >
        <DirtyWineIntegritetspolicyContent legalAddress={legalAddress} />
      </LegalPageLayout>
    );
  }

  const version = LEGAL_VERSIONS.privacy;

  return (
    <LegalPageLayout
      title={PACT_TITLE}
      lastUpdated={version}
      version={version}
    >
      <IntegritetspolicyContent />
    </LegalPageLayout>
  );
}
