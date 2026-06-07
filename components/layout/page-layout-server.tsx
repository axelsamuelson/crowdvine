import { resolveSiteLogosFromHeaders } from "@/lib/site-logos-server";
import { PageLayout, type PageLayoutProps } from "./page-layout";

/** Server-only wrapper that resolves footer/header logos for hydration-safe footers. */
export async function PageLayoutServer(props: Omit<PageLayoutProps, "initialLogos">) {
  const initialLogos = await resolveSiteLogosFromHeaders();
  return <PageLayout {...props} initialLogos={initialLogos} />;
}
