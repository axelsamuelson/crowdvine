import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getProducerB2bPalletDetail } from "@/lib/producer-b2b-pallets";
import { resolveB2bPalletAccessToken } from "@/lib/b2b-pallet-access-tokens";
import { linkProducerProfileIfEmailMatches } from "@/lib/producer-share-account";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProducerB2bPalletStatusEditor } from "@/components/producer/producer-b2b-pallet-status-editor";
import {
  ProducerB2bWineTable,
  ProducerB2bHubDeliveryActions,
} from "@/components/producer/producer-b2b-decision-actions";
import { ProducerB2bPalletSummary } from "@/components/producer/producer-b2b-pallet-summary";
import { cn } from "@/lib/utils";

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StageChip({
  label,
  done,
  awaiting,
  dateLabel,
}: {
  label: string;
  done: boolean;
  /** Next action for the producer (orange). */
  awaiting?: boolean;
  dateLabel?: string | null;
}) {
  return (
    <div
      className={cn(
        "min-w-[7.5rem] flex-1 rounded-xl border px-2.5 py-2",
        done
          ? "border-emerald-200 bg-emerald-50"
          : awaiting
            ? "border-amber-300 bg-amber-50"
            : "border-gray-200 bg-gray-50",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium",
          done
            ? "text-emerald-800"
            : awaiting
              ? "text-amber-900"
              : "text-gray-500",
        )}
      >
        {label}
      </p>
      {!(awaiting && !dateLabel) ? (
        <p
          className={cn(
            "mt-0.5 text-xs tabular-nums",
            done
              ? "text-gray-900"
              : awaiting
                ? "text-amber-800"
                : "text-gray-400",
          )}
        >
          {done
            ? dateLabel || "Done"
            : awaiting
              ? dateLabel || "Action needed"
              : "—"}
        </p>
      ) : null}
    </div>
  );
}

export default async function ProducerB2bPalletStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token: rawToken } = await searchParams;
  const user = await getCurrentUser();

  let producerId: string | null = null;
  let shareToken: string | null = null;
  let isShareAccess = false;

  if (rawToken?.trim()) {
    const grant = await resolveB2bPalletAccessToken(rawToken.trim());
    if (!grant || grant.shipmentId !== id) notFound();
    producerId = grant.producerId;
    shareToken = rawToken.trim();
    isShareAccess = true;
  } else {
    if (!user) redirect("/access-request");
    if (user.role !== "producer" && user.role !== "admin") redirect("/");
    if (!user.producer_id) redirect("/producer");
    producerId = user.producer_id;
  }

  if (!producerId) notFound();

  let canAct = !!user?.producer_id && user.producer_id === producerId;
  if (!canAct && user && shareToken) {
    canAct = await linkProducerProfileIfEmailMatches({
      userId: user.id,
      userEmail: user.email,
      producerId,
    });
  }

  const detail = await getProducerB2bPalletDetail(producerId, id);
  if (!detail) notFound();

  const s = detail.status;
  const confirmed =
    s.confirmed_quantity != null ? s.confirmed_quantity : null;
  const qtyDelta =
    confirmed != null ? confirmed - detail.orderedQuantity : null;
  const confirmedDone =
    s.producer_decision_status === "confirmed" ||
    s.producer_decision_status === "partial" ||
    s.producer_decision_status === "declined";
  const orderAccepted =
    s.producer_decision_status === "confirmed" ||
    s.producer_decision_status === "partial";
  const awaitingConfirm =
    !!s.order_sent_at && s.producer_decision_status === "pending";
  const awaitingHubDelivery = orderAccepted && !s.delivered_to_hub_at;
  const signupHref = shareToken
    ? `/producer/signup?token=${encodeURIComponent(shareToken)}&next=${encodeURIComponent(`/producer/pallets/${id}`)}`
    : "/producer/signup";
  const loginHref = `/log-in?next=${encodeURIComponent(
    shareToken
      ? `/producer/pallets/${id}?token=${encodeURIComponent(shareToken)}`
      : `/producer/pallets/${id}`,
  )}`;

  return (
    <main className={cn("min-h-screen bg-gray-50", !canAct && "pb-40")}>
      <div className="max-w-4xl mx-auto p-6 pt-top-spacing space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {!isShareAccess ? (
              <Link href="/producer/orders">
                <Button variant="outline" size="icon" className="rounded-full">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            ) : null}
            <div>
              <h1 className="text-2xl font-medium text-gray-900">
                {detail.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Your wines on this pallet
              </p>
            </div>
          </div>
          {canAct ? (
            <ProducerB2bPalletStatusEditor
              key={s.updated_at ?? "new"}
              shipmentId={detail.shipmentId}
              orderedQuantity={detail.orderedQuantity}
              initial={{
                producer_decision_status: s.producer_decision_status,
                producer_decided_at: s.producer_decided_at,
                confirmed_quantity: s.confirmed_quantity,
                pickup_date: s.pickup_date,
                pickup_date_confirmed_at: s.pickup_date_confirmed_at,
                goods_ready_at: s.goods_ready_at,
                producer_note: s.producer_note,
              }}
            />
          ) : null}
        </div>

        <ProducerB2bPalletSummary
          shippedLabel={formatDate(detail.shippedAt)}
          deliveredLabel={formatDate(detail.deliveredAt)}
          hubName={detail.hubName}
          hubAddress={detail.hubAddress}
          progress={detail.palletProgress}
          producers={detail.palletProducers}
        />

        {qtyDelta != null && qtyDelta !== 0 ? (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm",
              qtyDelta < 0
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-sky-200 bg-sky-50 text-sky-900",
            )}
          >
            Confirmed {confirmed} bottles (ordered {detail.orderedQuantity}) ·
            delta{" "}
            <span className="font-semibold tabular-nums">
              {qtyDelta > 0 ? `+${qtyDelta}` : qtyDelta}
            </span>
          </div>
        ) : null}

        {s.blocked_reason ? (
          <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Blocked</p>
              <p className="mt-0.5">{s.blocked_reason}</p>
            </div>
          </div>
        ) : null}

        <Card className="p-5 bg-white border border-gray-200 rounded-2xl space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-900">Your Progress</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {detail.orderedQuantity} bottles on this pallet
            </p>
            <div className="mt-3">
              <ProducerB2bWineTable
                shipmentId={detail.shipmentId}
                wines={detail.wines}
                editable={canAct && awaitingConfirm}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <StageChip
              label="Order sent"
              done={!!s.order_sent_at}
              dateLabel={formatDateTime(s.order_sent_at)}
            />
            <StageChip
              label={
                awaitingConfirm ? "Awaiting confirmation" : "Confirmed"
              }
              done={confirmedDone}
              awaiting={awaitingConfirm}
              dateLabel={
                s.producer_decision_status === "declined"
                  ? `Declined${formatDateTime(s.producer_decided_at) ? ` · ${formatDateTime(s.producer_decided_at)}` : ""}`
                  : awaitingConfirm
                    ? null
                    : s.producer_decision_status === "partial"
                      ? `Partial · ${formatDateTime(s.producer_decided_at) || "Done"}`
                      : formatDateTime(s.producer_decided_at)
              }
            />
            <StageChip
              label={
                awaitingHubDelivery
                  ? "Awaiting Hub Delivery"
                  : s.delivered_to_hub_at
                    ? "Delivered to Hub"
                    : "Hub Delivery"
              }
              done={!!s.delivered_to_hub_at}
              awaiting={awaitingHubDelivery}
              dateLabel={
                s.delivered_to_hub_at
                  ? formatDateTime(s.delivered_to_hub_at)
                  : null
              }
            />
            <StageChip
              label="Invoice received"
              done={!!s.invoice_received_at}
              dateLabel={formatDateTime(s.invoice_received_at)}
            />
            <StageChip
              label="Invoice paid"
              done={!!s.invoice_paid_at}
              dateLabel={formatDateTime(s.invoice_paid_at)}
            />
          </div>

          {canAct && awaitingHubDelivery ? (
            <ProducerB2bHubDeliveryActions
              shipmentId={detail.shipmentId}
              hubName={detail.hubName}
            />
          ) : null}

          {s.producer_note ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Your note
              </p>
              <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                {s.producer_note}
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      {!canAct ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl text-center">
            <Link href={signupHref}>
              <Button className="h-11 w-full max-w-sm rounded-full bg-black text-white hover:bg-black/90">
                Create Account
              </Button>
            </Link>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-600">
              Create an account so you can always come back to this status
              page, confirm and update orders, and keep track of your
              shipments.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href={loginHref}
                className="font-medium text-gray-900 underline underline-offset-2"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
