import type { Metadata } from "next";

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  
  return {
    title: "You're Invited to PACT!",
    description: "Congratulations! You've been invited to join PACT - an exclusive wine community where members share pallets and discover exceptional wines together.",
    openGraph: {
      title: "You're Invited to PACT!",
      description: "Congratulations! You've been invited to join PACT - an exclusive wine community where members share pallets and discover exceptional wines together.",
      type: "website",
      siteName: "PACT Wines",
      images: [
        {
          url: "/pact-og-invitation.jpg",
          width: 1200,
          height: 630,
          alt: "PACT Wines Invitation",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "You're Invited to PACT!",
      description: "Congratulations! You've been invited to join PACT - an exclusive wine community where members share pallets and discover exceptional wines together.",
      images: ["/pact-og-invitation.jpg"],
    },
  };
}

export default function InvitationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
