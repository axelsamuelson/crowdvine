import type { Metadata } from "next";

/** Invitation / private link pages should never be indexed. */
export const INVITE_PAGE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
};

export { NOINDEX_PAGE_ROBOTS } from "@/lib/seo/noindex-robots";
