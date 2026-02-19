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
    title: "Producer invitation – PACT",
    description:
      "You're invited to join PACT as a producer – connect with the community and share your wines.",
    openGraph: {
      title: "Producer invitation – PACT",
      description:
        "You're invited to join PACT as a producer – connect with the community and share your wines.",
      type: "website",
      siteName: "PACT Wines",
    },
    twitter: {
      card: "summary_large_image",
      title: "Producer invitation – PACT",
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
  return <div className={instrumentSerif.variable}>{children}</div>;
}
