import { redirect } from "next/navigation";

/** B2B pallets live under Orders — keep old URL working. */
export default function ProducerPalletsRedirect() {
  redirect("/producer/orders");
}
