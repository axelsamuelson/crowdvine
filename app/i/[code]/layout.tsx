import type { Metadata } from "next";
import { InvitationLinkOpenedTracker } from "@/components/analytics/invitation-link-opened-tracker";
import { INVITE_PAGE_ROBOTS } from "@/lib/seo/invite-robots";
import "./invite-opus.css";

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const params = await props.params;

  return {
    robots: INVITE_PAGE_ROBOTS,
    title: "You're Invited to PACT Wines!",
    description:
      "Congratulations! You've been invited to join PACT - an exclusive wine community where members share pallets and discover exceptional wines together.",
    openGraph: {
      title: "You're Invited to PACT Wines!",
      description:
        "Congratulations! You've been invited to join PACT - an exclusive wine community where members share pallets and discover exceptional wines together.",
      type: "website",
      siteName: "PACT Wines",
      images: [
        {
          url: "/pact-og-uploaded.jpg",
          width: 1200,
          height: 630,
          alt: "PACT Wines",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "You're Invited to PACT Wines!",
      description:
        "Congratulations! You've been invited to join PACT - an exclusive wine community where members share pallets and discover exceptional wines together.",
      images: ["/pact-og-uploaded.jpg"],
    },
  };
}

export default function InvitationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <InvitationLinkOpenedTracker surface="i_consumer" />
      {children}
    </>
  );
}
