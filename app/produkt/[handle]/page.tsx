import type { Metadata } from "next";

import {
  buildProductPdpMetadata,
  renderProductPdpPage,
} from "@/lib/i18n/pdp-page";
import {
  generateIndexablePdpStaticParams,
  PDP_REVALIDATE_SECONDS,
} from "@/lib/crowdvine/pdp-static-params";

export const revalidate = PDP_REVALIDATE_SECONDS;
export const dynamicParams = true;

export async function generateStaticParams() {
  return generateIndexablePdpStaticParams();
}

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await props.params;
  return buildProductPdpMetadata(handle, "sv", "produkt");
}

export default async function ProduktPage(props: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await props.params;
  return renderProductPdpPage({
    handle,
    locale: "sv",
    pathSegment: "produkt",
  });
}
