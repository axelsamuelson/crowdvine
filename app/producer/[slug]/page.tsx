import type { Metadata } from "next";

import {
  buildProducerPublicMetadata,
  renderProducerPublicPage,
} from "@/lib/i18n/producer-public-page";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  return buildProducerPublicMetadata(slug, "en", "producer");
}

export default async function ProducerPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  return renderProducerPublicPage({
    slug,
    locale: "en",
    pathSegment: "producer",
  });
}
