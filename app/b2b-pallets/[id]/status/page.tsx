import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProducerB2bPalletSummary } from "@/components/producer/producer-b2b-pallet-summary";
import { ProducerB2bWineTable } from "@/components/producer/producer-b2b-decision-actions";
import { resolveB2bPalletAccessToken } from "@/lib/b2b-pallet-access-tokens";
import { loadB2bPalletStatusOverview } from "@/lib/b2b-pallet-status-overview-data";
import { isProducerConfirmed } from "@/lib/b2b-pallet-producer-status";
import { getCurrentUser } from "@/lib/auth";
import { linkProducerProfileIfEmailMatches } from "@/lib/producer-share-account";
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

export default async function B2bPalletOverviewStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token: rawToken } = await searchParams;

  if (!rawToken?.trim()) notFound();
  const shareToken = rawToken.trim();

  const grant = await resolveB2bPalletAccessToken(shareToken);
  // Whole-pallet shares only (producer_id null).
  if (!grant || grant.shipmentId !== id || grant.producerId != null) {
    notFound();
  }

  const overview = await loadB2bPalletStatusOverview(id);
  if (!overview) notFound();

  const user = await getCurrentUser();
  let canActAsHub = false;
  if (overview.hubProducerId) {
    canActAsHub =
      !!user?.producer_id && user.producer_id === overview.hubProducerId;
    if (!canActAsHub && user) {
      canActAsHub = await linkProducerProfileIfEmailMatches({
        userId: user.id,
        userEmail: user.email,
        producerId: overview.hubProducerId,
      });
    }
  }

  const overviewPath = `/b2b-pallets/${id}/status?token=${encodeURIComponent(shareToken)}`;
  const signupHref = overview.hubProducerId
    ? `/producer/signup?token=${encodeURIComponent(shareToken)}&next=${encodeURIComponent(overviewPath)}`
    : null;
  const loginHref = `/log-in?next=${encodeURIComponent(overviewPath)}`;
  const showAccountCta = !!overview.hubProducerId && !canActAsHub;

  return (
    <main className={cn("min-h-screen bg-gray-50", showAccountCta && "pb-40")}>
      <div className="mx-auto max-w-4xl space-y-6 p-6 pt-top-spacing">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">{overview.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {overview.totalBottles} bottles · {overview.producers.length}{" "}
            producers on this pallet
          </p>
          {overview.hubProducerId ? (
            <p className="mt-1 text-xs text-gray-500">
              Consolidation hub: {overview.hubName}
            </p>
          ) : null}
        </div>

        <ProducerB2bPalletSummary
          shippedLabel={formatDate(overview.shippedAt)}
          deliveredLabel={formatDate(overview.deliveredAt)}
          hubName={overview.hubName}
          hubAddress={overview.hubAddress}
          progress={overview.progress}
          producers={overview.progressProducers}
        />

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-gray-900">All producers</h2>
          {overview.producers.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              No wines on this pallet yet.
            </Card>
          ) : (
            overview.producers.map((group) => {
              const s = group.status;
              const confirmed =
                s.confirmed_quantity != null ? s.confirmed_quantity : null;
              const qtyDelta =
                confirmed != null ? confirmed - group.orderedQuantity : null;
              const confirmedDone =
                s.producer_decision_status === "confirmed" ||
                s.producer_decision_status === "partial" ||
                s.producer_decision_status === "declined";
              const orderAccepted = isProducerConfirmed(s);
              const awaitingConfirm =
                !!s.order_sent_at && s.producer_decision_status === "pending";
              const awaitingHubDelivery =
                orderAccepted && !s.delivered_to_hub_at;

              return (
                <Card
                  key={group.producerId}
                  className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5"
                >
                  <div>
                    <h3 className="text-base font-medium text-gray-900">
                      {group.producerName}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {group.orderedQuantity} bottles on this pallet
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                      Ordered wines
                    </p>
                    <ProducerB2bWineTable
                      shipmentId={overview.shipmentId}
                      wines={group.wines}
                      editable={false}
                    />
                  </div>

                  {qtyDelta != null && qtyDelta !== 0 ? (
                    <div
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm",
                        qtyDelta < 0
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-sky-200 bg-sky-50 text-sky-900",
                      )}
                    >
                      Confirmed {confirmed} (ordered {group.orderedQuantity}) ·
                      delta{" "}
                      <span className="font-semibold tabular-nums">
                        {qtyDelta > 0 ? `+${qtyDelta}` : qtyDelta}
                      </span>
                    </div>
                  ) : null}

                  {s.blocked_reason ? (
                    <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">Blocked</p>
                        <p className="mt-0.5">{s.blocked_reason}</p>
                      </div>
                    </div>
                  ) : null}

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
                      done={
                        confirmedDone &&
                        s.producer_decision_status !== "declined"
                      }
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

                  {s.producer_note ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                        Producer note
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                        {s.producer_note}
                      </p>
                    </div>
                  ) : null}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {showAccountCta && signupHref ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto max-w-4xl text-center">
            <Link href={signupHref}>
              <Button className="h-11 w-full max-w-sm rounded-full bg-black text-white hover:bg-black/90">
                Create Account
              </Button>
            </Link>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-600">
              Create an account for {overview.hubName} so you can always come
              back to this pallet status page and keep track of the shipment.
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
