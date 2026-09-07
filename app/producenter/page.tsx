import type { Metadata } from "next";

import {
  buildProducersDirectoryMetadata,
  renderProducersDirectoryPage,
} from "@/lib/i18n/producers-directory-page";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return buildProducersDirectoryMetadata("sv");
}

export default async function ProducenterPage() {
  return renderProducersDirectoryPage("sv");
}
