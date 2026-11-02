import type { Metadata } from "next";
import { INVITE_PAGE_ROBOTS } from "@/lib/seo/invite-robots";
import "../../i/[code]/invite-opus.css";

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  return {
    robots: INVITE_PAGE_ROBOTS,
    title: "You're Invited to Dirty Wine",
    description:
      "Business access to exclusive wines. B2B pricing, trade offerings, and direct producer connections.",
    openGraph: {
      title: "You're Invited to Dirty Wine",
      description:
        "Business access to exclusive wines. B2B pricing, trade offerings, and direct producer connections.",
      type: "website",
      siteName: "Dirty Wine",
    },
    twitter: {
      card: "summary_large_image",
      title: "You're Invited to Dirty Wine",
      description:
        "Business access to exclusive wines. B2B pricing, trade offerings, and direct producer connections.",
    },
  };
}

export default function BusinessInviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
