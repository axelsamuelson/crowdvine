import { getSiteContentByKey } from "@/lib/actions/content";
import { resolveLogoKeyByHost } from "@/lib/content-logo-utils";

type LogoSearchParams = { get: (key: string) => string | null } | null;

async function resolveLogoUrl(
  baseKey: "header_logo" | "footer_logo",
  host: string | null,
  searchParams?: LogoSearchParams,
): Promise<string | null> {
  const resolvedKey = resolveLogoKeyByHost(baseKey, host, searchParams);
  let value = await getSiteContentByKey(resolvedKey);

  if (!value?.trim() && resolvedKey !== baseKey) {
    value = await getSiteContentByKey(baseKey);
  }

  const trimmed = value?.trim();
  return trimmed && trimmed !== "null" ? trimmed : null;
}

export async function resolveSiteLogosFromRequest(options: {
  host: string | null;
  searchParams?: LogoSearchParams;
}): Promise<{ headerLogo: string | null; footerLogo: string | null }> {
  const [headerLogo, footerLogo] = await Promise.all([
    resolveLogoUrl("header_logo", options.host, options.searchParams),
    resolveLogoUrl("footer_logo", options.host, options.searchParams),
  ]);

  return { headerLogo, footerLogo };
}
