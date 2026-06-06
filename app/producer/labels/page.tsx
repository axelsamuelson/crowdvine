import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProducerLabelsClient from "@/components/producer/producer-labels-client";

export default async function ProducerLabelsPage() {
  const user = await getCurrentUser();
  if (
    !user ||
    (user.role !== "producer" && user.role !== "admin")
  ) {
    redirect("/log-in");
  }
  if (!user.producer_id) redirect("/producer");
  return <ProducerLabelsClient />;
}
