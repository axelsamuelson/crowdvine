import type { Metadata } from "next";
import { NOINDEX_PAGE_ROBOTS } from "@/lib/seo/noindex-robots";

export const metadata: Metadata = {
  robots: NOINDEX_PAGE_ROBOTS,
};

export const dynamic = "force-static";

export default function Concept6Page() {
  return null;
}
