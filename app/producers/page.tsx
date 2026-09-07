import type { Metadata } from "next";

import {
  buildProducersDirectoryMetadata,
  renderProducersDirectoryPage,
} from "@/lib/i18n/producers-directory-page";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return buildProducersDirectoryMetadata("en");
}

export default async function ProducersPage() {
  return renderProducersDirectoryPage("en");
}
