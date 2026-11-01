import type { Metadata } from "next";
import { InvitationLinkOpenedTracker } from "@/components/analytics/invitation-link-opened-tracker";
import { INVITE_PAGE_ROBOTS } from "@/lib/seo/invite-robots";
import "../../i/[code]/invite-opus.css";

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  return {
    robots: INVITE_PAGE_ROBOTS,
    title: "Producer invitation – PACT Wines",
    description:
      "You're invited to join PACT as a producer – connect with the community and share your wines.",
    openGraph: {
      title: "Producer invitation – PACT Wines",
      description:
        "You're invited to join PACT as a producer – connect with the community and share your wines.",
      type: "website",
      siteName: "PACT Wines",
    },
    twitter: {
      card: "summary_large_image",
      title: "Producer invitation – PACT Wines",
      description:
        "You're invited to join PACT as a producer – connect with the community and share your wines.",
    },
  };
}

export default function ProducerInviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InvitationLinkOpenedTracker surface="p_producer" />
      {children}
    </>
  );
}
