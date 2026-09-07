import type { Metadata } from "next";

import { NOINDEX_PAGE_ROBOTS } from "@/lib/seo/noindex-robots";

/** Private / transactional / tooling pages — never index. */
export const privatePageMetadata: Metadata = {
  robots: NOINDEX_PAGE_ROBOTS,
};
