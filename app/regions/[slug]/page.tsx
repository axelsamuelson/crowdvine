import type { Metadata } from "next";

import {
  buildWineRegionPageMetadata,
  renderWineRegionPage,
  wineRegionStaticParams,
} from "@/lib/i18n/wine-region-page";

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return wineRegionStaticParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  return buildWineRegionPageMetadata(slug, "en");
}

export default async function RegionPageEn(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  return renderWineRegionPage({ slugParam: slug, locale: "en" });
}
