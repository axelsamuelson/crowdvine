import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-server";
import { ReservationPaymentAuthenticateClient } from "./authenticate-client";

export default async function ReservationAuthenticatePaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id?.trim()) {
    redirect("/profile/reservations");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/?next=${encodeURIComponent(`/reservations/${id.trim()}/authenticate`)}`);
  }

  return <ReservationPaymentAuthenticateClient reservationId={id.trim()} />;
}
