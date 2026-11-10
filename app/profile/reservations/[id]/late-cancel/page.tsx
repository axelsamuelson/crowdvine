"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";

/**
 * Customer late-delivery cancel-for-full-refund (30 days after pallet close).
 * Refund promised within 14 days. Behind pallet-close flow flags server-side.
 */
export default function LateDeliveryCancelPage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = String(params?.id || "");
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    refundPromisedBy: string;
    alreadyCancelled: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(
          `/api/user/reservations/${encodeURIComponent(reservationId)}/late-delivery-cancel`,
        );
        const data = await resp.json().catch(() => null);
        if (cancelled) return;
        if (!resp.ok) {
          setEligible(false);
          setReason(data?.error || "error");
        } else {
          setEligible(Boolean(data?.eligible));
          setReason(data?.reason || null);
        }
      } catch {
        if (!cancelled) {
          setEligible(false);
          setReason("error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  const onCancel = async () => {
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch(
        `/api/user/reservations/${encodeURIComponent(reservationId)}/late-delivery-cancel`,
        { method: "POST" },
      );
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) {
        setError(data?.message || "Kunde inte avboka");
        return;
      }
      setDone({
        refundPromisedBy: String(data.refundPromisedBy || ""),
        alreadyCancelled: Boolean(data.alreadyCancelled),
      });
    } catch {
      setError("Kunde inte avboka");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageLayout>
      <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
        <Link
          href="/profile/reservations"
          className="text-sm text-gray-600 underline underline-offset-4"
        >
          ← Tillbaka till mina köp
        </Link>
        <h1 className="text-2xl font-medium text-gray-900">
          Avboka med full återbetalning
        </h1>
        <p className="text-sm text-gray-600">
          Om leveransen inte skett inom 30 dagar efter att pallen stängt kan du
          avboka. Full återbetalning sker inom 14 dagar.
        </p>
        <p className="text-sm text-gray-600">
          If delivery has not happened within 30 days after the pallet closed,
          you can cancel for a full refund within 14 days.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Kontrollerar…</p>
        ) : done ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
            <p>
              {done.alreadyCancelled
                ? "Avbokning redan registrerad."
                : "Avbokning registrerad."}
            </p>
            {done.refundPromisedBy ? (
              <p className="mt-2 text-gray-600">
                Återbetalning senast{" "}
                {new Date(done.refundPromisedBy).toLocaleDateString("sv-SE")}.
              </p>
            ) : null}
            <Button
              className="mt-4"
              onClick={() => router.push("/profile/reservations")}
            >
              Visa mina köp
            </Button>
          </div>
        ) : eligible ? (
          <div className="space-y-3">
            <Button disabled={busy} onClick={() => void onCancel()}>
              {busy ? "Avbokar…" : "Avboka och begär återbetalning"}
            </Button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Alternativet är inte tillgängligt
            {reason ? ` (${reason})` : ""}.
          </p>
        )}
      </div>
    </PageLayout>
  );
}
