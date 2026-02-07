import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "../../i/[code]/invite-opus.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export async function generateMetadata(props: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  return {
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
  return <div className={instrumentSerif.variable}>{children}</div>;
}
