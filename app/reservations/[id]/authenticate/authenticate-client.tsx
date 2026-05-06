"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";

const publishableKey =
  typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "") : "";
const stripePromise =
  publishableKey.length > 0 ? loadStripe(publishableKey) : null;

const pactAppearance = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "#000000",
    colorBackground: "#ffffff",
    colorText: "#000000",
    colorTextSecondary: "#666666",
    fontFamily: "Geist, system-ui, -apple-system, sans-serif",
    fontSizeBase: "14px",
    borderRadius: "6px",
    spacingUnit: "3px",
  },
};

function InnerForm({
  reservationId,
  clientSecret,
  amountSek,
}: {
  reservationId: string;
  clientSecret: string;
  amountSek: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handlePay = useCallback(async () => {
    if (!stripe || !elements) {
      toast.error("Stripe är inte redo. Ladda om sidan.");
      return;
    }
    setBusy(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message ?? "Kontrollera kortuppgifterna");
        return;
      }
      const returnUrl = `${window.location.origin}/checkout/stripe-return`;
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: { return_url: returnUrl },
      });
      if (error) {
        toast.error(error.message ?? "Betalningen misslyckades");
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        toast.success("Betalningen lyckades!");
        router.push(
          `/checkout/success?success=true&reservationId=${encodeURIComponent(reservationId)}&message=${encodeURIComponent("Betalning genomförd")}`,
        );
        return;
      }
      if (paymentIntent?.status === "processing") {
        toast.info("Betalningen behandlas …");
        router.push(
          `/checkout/success?success=true&reservationId=${encodeURIComponent(reservationId)}&message=${encodeURIComponent("Betalning behandlas")}`,
        );
      }
    } finally {
      setBusy(false);
    }
  }, [stripe, elements, clientSecret, reservationId, router]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Belopp: <strong>{amountSek} kr</strong> inkl. moms (enligt Stripe).
      </p>
      <PaymentElement />
      <Button type="button" className="w-full" size="lg" onClick={handlePay} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verifiera och betala"}
      </Button>
    </div>
  );
}

export function ReservationPaymentAuthenticateClient({
  reservationId,
}: {
  reservationId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountSek, setAmountSek] = useState(0);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/reservations/${encodeURIComponent(reservationId)}/payment-recovery`,
          { credentials: "include" },
        );
        const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        if (cancelled) return;
        if (res.status === 401) {
          setError("Du måste vara inloggad för att verifiera betalningen.");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const msg =
            typeof data?.error === "string" && data.error.trim()
              ? data.error
              : "Kunde inte ladda betalningen";
          setError(msg);
          setLoading(false);
          return;
        }
        if (data?.alreadyPaid === true) {
          setAlreadyPaid(true);
          setLoading(false);
          return;
        }
        const secret =
          typeof data?.clientSecret === "string" && data.clientSecret.trim()
            ? data.clientSecret.trim()
            : null;
        if (!secret) {
          setError("Saknar Stripe client secret");
          setLoading(false);
          return;
        }
        setClientSecret(secret);
        const amt = typeof data.amountSek === "number" ? data.amountSek : 0;
        setAmountSek(amt);
      } catch {
        if (!cancelled) setError("Nätverksfel");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  if (!stripePromise) {
    return (
      <PageLayout>
        <Card className="max-w-lg mx-auto mt-8">
          <CardHeader>
            <CardTitle>Betalning</CardTitle>
            <CardDescription>Stripe är inte konfigurerat i denna miljö.</CardDescription>
          </CardHeader>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Verifiera betalning</CardTitle>
            <CardDescription>
              Din bank krävde extra säkerhet (3D Secure / BankID). Slutför betalningen här.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="space-y-3 text-sm">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" asChild>
                  <Link href="/profile/reservations">Till mina reservationer</Link>
                </Button>
                <Button variant="link" className="px-0" asChild>
                  <Link href="/">Till startsidan</Link>
                </Button>
              </div>
            ) : alreadyPaid ? (
              <div className="space-y-3 text-sm">
                <p>Den här reservationen är redan markerad som betald.</p>
                <Button asChild>
                  <Link href="/profile/reservations">Visa reservationer</Link>
                </Button>
              </div>
            ) : clientSecret ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: pactAppearance,
                }}
              >
                <InnerForm
                  reservationId={reservationId}
                  clientSecret={clientSecret}
                  amountSek={amountSek}
                />
              </Elements>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
