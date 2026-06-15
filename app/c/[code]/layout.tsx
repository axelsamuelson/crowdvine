import type { Metadata } from "next";
import { INVITE_PAGE_ROBOTS } from "@/lib/seo/invite-robots";

export const metadata: Metadata = {
  robots: INVITE_PAGE_ROBOTS,
  title: "Campaign invitation – PACT Wines",
};

export default function CampaignInviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
