import { Suspense } from "react";
import { CheckoutStripeReturnClient } from "./checkout-stripe-return-client";

function StripeReturnFallback() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md space-y-3 p-6 pt-top-spacing text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-foreground" />
        <h1 className="text-lg font-medium text-foreground">
          Finalizing your reservation…
        </h1>
        <p className="text-sm text-muted-foreground">
          Please wait while we verify your payment.
        </p>
      </div>
    </main>
  );
}

export default function CheckoutStripeReturnPage() {
  return (
    <Suspense fallback={<StripeReturnFallback />}>
      <CheckoutStripeReturnClient />
    </Suspense>
  );
}
