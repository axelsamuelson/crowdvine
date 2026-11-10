"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";
import type { AppLocale } from "@/lib/i18n/locale";

/**
 * Customer late-delivery cancel-for-full-refund (30 days after pallet close).
 * Refund promised within 14 days. Behind pallet-close flow flags server-side.
 */
export default function LateDeliveryCancelPage() {
  const params = useParams();
  const router = useRouter();
  const { t, context: shopping } = useShoppingContext();
  const appLocale = shopping.locale as AppLocale;
  const intlLocale = shopping.intlLocale;
  const ordersHref =
    appLocale === "en" ? "/en/profile/reservations" : "/profile/reservations";
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
        setError(data?.message || t("profile.lateCancelError"));
        return;
      }
      setDone({
        refundPromisedBy: String(data.refundPromisedBy || ""),
        alreadyCancelled: Boolean(data.alreadyCancelled),
      });
    } catch {
      setError(t("profile.lateCancelError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageLayout>
      <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
        <Link
          href={ordersHref}
          className="text-sm text-gray-600 underline underline-offset-4"
        >
          {t("profile.lateCancelBack")}
        </Link>
        <h1 className="text-2xl font-medium text-gray-900">
          {t("profile.lateCancelTitle")}
        </h1>
        <p className="text-sm text-gray-600">{t("profile.lateCancelBody")}</p>

        {loading ? (
          <p className="text-sm text-gray-500">{t("profile.lateCancelChecking")}</p>
        ) : done ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
            <p>
              {done.alreadyCancelled
                ? t("profile.lateCancelAlreadyDone")
                : t("profile.lateCancelDone")}
            </p>
            {done.refundPromisedBy ? (
              <p className="mt-2 text-gray-600">
                {t("profile.lateCancelRefundBy", {
                  date: new Date(done.refundPromisedBy).toLocaleDateString(
                    intlLocale,
                  ),
                })}
              </p>
            ) : null}
            <Button
              className="mt-4"
              onClick={() => router.push(ordersHref)}
            >
              {t("profile.lateCancelViewOrders")}
            </Button>
          </div>
        ) : eligible ? (
          <div className="space-y-3">
            <Button disabled={busy} onClick={() => void onCancel()}>
              {busy ? t("profile.lateCancelBusy") : t("profile.lateCancelCta")}
            </Button>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            {t("profile.lateCancelUnavailable")}
            {reason ? ` (${reason})` : ""}.
          </p>
        )}
      </div>
    </PageLayout>
  );
}
