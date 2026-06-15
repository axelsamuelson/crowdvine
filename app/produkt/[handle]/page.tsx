import type { Metadata } from "next";

import {
  buildProductPdpMetadata,
  renderProductPdpPage,
} from "@/lib/i18n/pdp-page";

export const dynamic = "force-dynamic";

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
