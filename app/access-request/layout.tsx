import type { Metadata } from "next";

import { translate } from "@/lib/i18n/messages";
import { privatePageMetadata } from "@/lib/seo/private-page-metadata";
import { getCachedShoppingContextFromRequest } from "@/lib/shopping-context/server";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getCachedShoppingContextFromRequest({ skipUser: true });
  const locale = ctx.locale;
  const description = translate(locale, "accessRequest.metaDescription");

  return {
    ...privatePageMetadata,
    description,
    openGraph: {
      description,
      locale: locale === "sv" ? "sv_SE" : "en_US",
    },
  };
}

export default function AccessRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
