import { CheckoutClient } from "./checkout-client";
import { isPlatformOpen } from "@/lib/platform-open";

export default function CheckoutPage() {
  return <CheckoutClient platformOpen={isPlatformOpen()} />;
}
