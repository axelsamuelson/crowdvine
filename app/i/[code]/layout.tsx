import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./invite-opus.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const params = await props.params;

  return {
    title: "You're Invited to PACT!",
    description:
      "Congratulations! You've been invited to join PACT - an exclusive wine community where members share pallets and discover exceptional wines together.",
    openGraph: {
      title: "You're Invited to PACT!",
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
      title: "You're Invited to PACT!",
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
    <div className={instrumentSerif.variable}>
      {children}
    </div>
  );
}
