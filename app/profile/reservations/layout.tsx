import type { Metadata } from "next";

/**
 * Default HTML <title> for the order list (route stays /profile/reservations).
 * Client page overrides with locale-aware copy via document.title.
 */
export const metadata: Metadata = {
  title: "Mina köp",
};

export default function ProfileReservationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
