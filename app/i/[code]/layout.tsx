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
          url: "/placeholder-logo.png",
          width: 215,
          height: 48,
          alt: "PACT Wines Logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "You're Invited to PACT!",
      description: "Congratulations! You've been invited to join PACT - an exclusive wine community where members share pallets and discover exceptional wines together.",
      images: ["/placeholder-logo.png"],
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
