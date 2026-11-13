"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";
import { formatMoney } from "@/lib/shopping-context/format";
import type { AppLocale } from "@/lib/i18n/locale";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";
import { producerDisplayName } from "@/lib/producer-display-name";
import { formatSharedPalletChargeDeadline } from "@/lib/checkout/shared-pallet-deadline";
import { MarketingConsentCheckbox } from "@/components/checkout/marketing-consent-checkbox";
import { GuestAccountOffer } from "@/components/checkout/guest-account-offer";
import {
  confirmationStatusMessageKey,
  shortReservationReference,
} from "@/lib/reservations/confirmation-display-total";
import { confirmationSharedPalletCity } from "@/lib/reservations/confirmation-destination-label";
import { resolveWineImageSrc } from "@/lib/cart/wine-image-url";

function translateReservationStatus(
  status: string,
  t: (key: string) => string,
): string | null {
  const key = confirmationStatusMessageKey(status);
  return key ? t(key) : null;
}

interface ReservationDetails {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  pallet_name?: string;
  pallet_cost_cents?: number;
  pallet_capacity?: number;
  /** Shared-pallet charge/close deadline ISO (created_at + 28d). */
  charge_deadline_at?: string | null;
  pickup_zone?: string | null;
  delivery_zone?: string | null;
  delivery_address?: string;
  /** Charged total wine + shipping (SEK). */
  total_sek?: number | null;
  wines_total_sek?: number | null;
  shipping_sek?: number | null;
  show_pickup_zone?: boolean;
  fulfillment_channel?: string | null;
  /** Promo discount from order_reservations.discount_amount_sek (SEK). */
  discount_amount_sek?: number;
  /** Pre-discount amount (total_sek + discount_amount_sek) when totals are stored. */
  subtotal_sek?: number;
  total_amount_cents?: number;
  shipping_cost_cents?: number;
  customer_email?: string;
  customer_name?: string;
  /** Unclaimed guest checkout — optional account offer on confirmation. */
  is_guest_checkout?: boolean;
  order_type?: "producer" | "warehouse";
  payment_method_type?: "card" | "invoice";
  /** True when order confirmation was claimed/sent (email_sends). */
  confirmation_email_sent?: boolean;
  items: Array<{
    wine_name: string;
    quantity: number;
    vintage: string;
    price_cents: number;
    /** Charged line total in whole kronor (preferred). */
    line_total_sek?: number;
    image_url?: string;
    /** Raw storage path — same field Mina köp / list API resolve. */
    label_image_path?: string | null;
    product_handle?: string;
    producer_name?: string;
    producer_display_name?: string | null;
    customer_email?: string;
    customer_name?: string;
    source?: "producer" | "warehouse";
  }>;
  shared?: Array<{
    to_user: { id: string; full_name?: string; avatar_image_path?: string };
    total_cents: number;
    items: Array<{
      wine_id: string;
      wine_name: string;
      vintage: string;
      producer_name?: string;
      producer_display_name?: string | null;
      product_handle?: string;
      image_url?: string;
      quantity: number;
      price_cents: number;
    }>;
  }>;
}

/** Legacy return_url pointed here; relay to stripe-return so confirm-stripe-run runs. */
function CheckoutSuccessStripeRelay() {
  const { t } = useShoppingContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const si = searchParams.get("setup_intent")?.trim() ?? "";
  const pi = searchParams.get("payment_intent")?.trim() ?? "";
  const needsRelay = Boolean(si || pi);

  useEffect(() => {
    if (!needsRelay) return;

    const rs = searchParams.get("redirect_status")?.trim() ?? "";
    const next = new URLSearchParams();
    if (si) next.set("setup_intent", si);
    if (pi) next.set("payment_intent", pi);
    if (rs) next.set("redirect_status", rs);

    console.info(
      "[checkout/success] Stripe return detected; relaying to /checkout/stripe-return",
      {
        hasSetupIntent: Boolean(si),
        hasPaymentIntent: Boolean(pi),
        redirectStatus: rs || null,
      },
    );

    router.replace(`/checkout/stripe-return?${next.toString()}`);
  }, [needsRelay, router, searchParams, si, pi]);

  if (needsRelay) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto" />
          <p className="text-gray-700">{t("checkout.successCompleting")}</p>
          <p className="text-sm text-gray-500">{t("checkout.successMoment")}</p>
        </div>
      </div>
    );
  }

  return <CheckoutConfirmationContent />;
}

function CheckoutConfirmationContent() {
  const { t, context: shopping } = useShoppingContext();
  const appLocale = shopping.locale as AppLocale;
  const paths = localizedPathsForLocale(appLocale);
  const intlLocale = shopping.intlLocale;
  const currencyCode = shopping.currencyCode || "SEK";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [groupReservationIds, setGroupReservationIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reservationIdParam = searchParams.get("reservationId");
  const checkoutGroupIdParam = searchParams.get("checkoutGroupId");
  const message = searchParams.get("message");
  const confirmationEmailSentParam =
    searchParams.get("confirmationEmailSent") === "1";

  const hasIdParams = Boolean(
    reservationIdParam?.trim() || checkoutGroupIdParam?.trim(),
  );
  const ambiguousLanding =
    !hasIdParams && loadError === "no_id" && !reservation;

  useEffect(() => {
    if (message) {
      toast.success(decodeURIComponent(message));
    }

    localStorage.removeItem("cart-cache");
    localStorage.removeItem("cart-cache-time");

    let cancelled = false;

    async function run() {
      setLoadError(null);
      setReservation(null);
      setGroupReservationIds([]);

      const ridRaw = reservationIdParam?.trim() ?? "";
      const gidRaw = checkoutGroupIdParam?.trim() ?? "";

      console.info("[checkout/success] params", {
        hasReservationId: Boolean(ridRaw),
        hasCheckoutGroupId: Boolean(gidRaw),
      });

      let idsFromGroup: string[] = [];

      if (gidRaw) {
        const res = await fetch(
          `/api/user/reservations/by-checkout-group/${encodeURIComponent(gidRaw)}`,
        );
        const parsed: unknown = await res.json().catch(() => null);
        const data =
          parsed && typeof parsed === "object"
            ? (parsed as { reservationIds?: unknown })
            : null;
        const ids = Array.isArray(data?.reservationIds)
          ? (data.reservationIds as unknown[]).filter(
              (x): x is string => typeof x === "string" && x.trim() !== "",
            )
          : [];

        console.info("[checkout/success] by-checkout-group", {
          status: res.status,
          idCount: ids.length,
          checkoutGroupId: gidRaw,
        });

        if (res.ok && ids.length > 0) {
          idsFromGroup = ids;
        }
      }

      let primaryId: string | null = null;
      if (gidRaw && idsFromGroup.length > 0) {
        primaryId =
          ridRaw && idsFromGroup.includes(ridRaw) ? ridRaw : idsFromGroup[0]!;
      } else if (ridRaw) {
        primaryId = ridRaw;
      }

      if (!primaryId) {
        console.warn("[checkout/success] no primary reservation id", {
          ridRaw: ridRaw || null,
          gidRaw: gidRaw || null,
        });
        if (!cancelled) {
          setLoadError("no_id");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setGroupReservationIds(idsFromGroup);
      }

      console.info("[checkout/success] fetch reservation", {
        primaryReservationId: primaryId,
        groupReservationCount: idsFromGroup.length,
      });

      const response = await fetch(`/api/user/reservations/${primaryId}`);

      console.info("[checkout/success] reservation GET", {
        status: response.status,
        primaryReservationId: primaryId,
      });

      if (!response.ok) {
        if (!cancelled) {
          setLoadError(`http_${response.status}`);
          setLoading(false);
        }
        return;
      }

      const payload: unknown = await response.json().catch(() => null);
      if (!payload || typeof payload !== "object") {
        if (!cancelled) {
          setLoadError("invalid_payload");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setReservation(payload as ReservationDetails);
        setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [checkoutGroupIdParam, message, reservationIdParam]);

  const getStatusColor = (_status: string) => {
    return "bg-muted text-muted-foreground";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(intlLocale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (cents: number) => {
    return formatMoney(cents / 100, currencyCode, appLocale);
  };

  const deadlineLocale = appLocale === "en" ? "en" : "sv";
  const chargeDeadlineLabel = reservation?.charge_deadline_at
    ? formatSharedPalletChargeDeadline(
        reservation.charge_deadline_at,
        deadlineLocale,
      )
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("checkout.successLoading")}</p>
        </div>
      </div>
    );
  }

  const destinationCity = reservation
    ? confirmationSharedPalletCity({
        deliveryAddress: reservation.delivery_address,
        deliveryZone: reservation.delivery_zone,
      })
    : null;
  const totalSekRounded = reservation
    ? Math.round(
        reservation.total_sek != null &&
          Number.isFinite(Number(reservation.total_sek))
          ? Number(reservation.total_sek)
          : (reservation.total_amount_cents || 0) / 100,
      )
    : 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-[640px] px-6 pt-top-spacing pb-8 space-y-8">
        {/* Icon above heading so mobile content shares one column width */}
        <div className="space-y-4">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              ambiguousLanding ? "bg-muted" : "bg-muted"
            }`}
          >
            <CheckCircle className="h-6 w-6 text-foreground" />
          </div>

          {ambiguousLanding ? (
            <>
              <h1 className="text-2xl font-medium text-gray-900">
                {t("checkout.successTitleError")}
              </h1>
              <p className="text-gray-500">
                {t("checkout.successSubtitleError")}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-medium text-gray-900">
                {t("checkout.successTitleConfirmed")}
              </h1>
              {(() => {
                const email = reservation?.customer_email?.trim() || "—";
                const datum = chargeDeadlineLabel || "—";
                const confirmationEmailSent =
                  reservation?.confirmation_email_sent === true ||
                  confirmationEmailSentParam;
                const belopp =
                  appLocale === "en"
                    ? `${totalSekRounded} SEK`
                    : `${totalSekRounded} kr`;
                return (
                  <p
                    className="text-gray-800 text-base leading-relaxed"
                    data-testid="success-purchase-complete"
                    data-confirmation-email-sent={
                      confirmationEmailSent ? "1" : "0"
                    }
                  >
                    {confirmationEmailSent
                      ? t("checkout.successPurchaseComplete", {
                          belopp,
                          datum,
                          email,
                        })
                      : t("checkout.successPurchaseCompleteNoEmail", {
                          belopp,
                          datum,
                        })}
                  </p>
                );
              })()}
              {reservation?.is_guest_checkout ? (
                <GuestAccountOffer
                  email={reservation.customer_email}
                  reservationId={reservation.id}
                />
              ) : reservation ? (
                <MarketingConsentCheckbox email={reservation.customer_email} />
              ) : null}
            </>
          )}

          {reservation ? (
            <div className="space-y-1 text-sm text-gray-500">
              <div>
                {t("checkout.successOrderedAt", {
                  datum: formatDate(reservation.created_at),
                })}
              </div>
              <div className="font-sans tabular-nums" title={reservation.id}>
                <span className="text-gray-500">
                  {t("checkout.successOrderNumber")}
                </span>
                {": "}
                <span className="text-gray-900">
                  {shortReservationReference(reservation.id)}
                </span>
              </div>
              {destinationCity ? (
                <div data-testid="success-shared-pallet-destination">
                  {t("checkout.successSharedPalletTo", {
                    city: destinationCity,
                  })}
                </div>
              ) : null}
              {(() => {
                const statusLabel = translateReservationStatus(
                  reservation.status,
                  t,
                );
                if (!statusLabel) return null;
                return (
                  <Badge
                    className={`${getStatusColor(reservation.status)} normal-case tracking-normal mt-1`}
                  >
                    {statusLabel}
                  </Badge>
                );
              })()}
            </div>
          ) : null}
        </div>

        {reservation && groupReservationIds.length > 1 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
            {t("checkout.successGroupBanner", {
              count: String(groupReservationIds.length),
            })}
          </div>
        ) : null}

        {!reservation ? (
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <CardContent className="p-0">
              <p className="text-gray-600">
                {ambiguousLanding
                  ? t("checkout.successErrorAmbiguous")
                  : loadError === "no_id"
                    ? t("checkout.successErrorNoId")
                    : loadError?.startsWith("http_")
                      ? t("checkout.successErrorHttp")
                      : t("checkout.successErrorGeneric")}
              </p>
              {(reservationIdParam?.trim() || checkoutGroupIdParam?.trim()) && (
                <p className="text-xs text-gray-500 mt-3 font-sans tabular-nums break-all">
                  {t("checkout.successReference")}{" "}
                  {reservationIdParam?.trim() ||
                    `checkoutGroup:${checkoutGroupIdParam?.trim()}`}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  onClick={() =>
                    router.push(
                      appLocale === "en"
                        ? "/en/profile/reservations"
                        : "/profile/reservations",
                    )
                  }
                  className="bg-black hover:bg-black/90 text-white rounded-full"
                >
                  {t("checkout.successViewReservations")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(paths.shop)}
                  className="rounded-full"
                >
                  {t("checkout.continueShopping")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {reservation.shared && reservation.shared.length > 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="text-sm font-medium text-gray-900">
                    {t("checkout.successSharedBottles")}
                  </div>
                  <div className="text-xs text-gray-500">
                    {reservation.shared.length}{" "}
                    {reservation.shared.length === 1
                      ? t("checkout.successPerson")
                      : t("checkout.successPeople")}
                  </div>
                </div>
                <div className="space-y-3">
                  {reservation.shared.map((share) => (
                    <div
                      key={share.to_user.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {share.to_user.full_name ||
                              t("checkout.successFriend")}
                          </div>
                          <div className="text-xs text-gray-500">
                            {share.items.reduce(
                              (sum, i) => sum + (i.quantity || 0),
                              0,
                            )}{" "}
                            {t("checkout.bottles")}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                          {formatPrice(share.total_cents || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-gray-500 mt-3">
                  {t("checkout.successSplitNote")}
                </div>
              </div>
            ) : null}

            <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
              <CardContent className="p-0">
                <div className="text-lg font-medium text-gray-900 mb-4">
                  {t("checkout.successReservedBottles")}
                </div>

                <div className="space-y-3">
                  {reservation.items.map((item, index) => {
                    const lineSek =
                      typeof item.line_total_sek === "number" &&
                      Number.isFinite(item.line_total_sek)
                        ? Math.round(item.line_total_sek)
                        : Math.round(
                            ((item.price_cents || 0) * (item.quantity || 0)) /
                              100,
                          );
                    return (
                      <div
                        key={index}
                        className="flex gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl bg-gray-200 border border-gray-200">
                          <Image
                            src={resolveWineImageSrc(
                              item.image_url ?? item.label_image_path,
                            )}
                            alt={`${item.wine_name} ${item.vintage}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                                {item.wine_name}
                                {item.vintage ? ` ${item.vintage}` : ""}
                              </div>
                              {producerDisplayName({
                                name: item.producer_name,
                                display_name: item.producer_display_name,
                              }) ? (
                                <div className="text-sm text-gray-500 line-clamp-2">
                                  {producerDisplayName({
                                    name: item.producer_name,
                                    display_name: item.producer_display_name,
                                  })}
                                </div>
                              ) : null}
                              <div className="text-xs text-gray-500 mt-1">
                                {item.quantity}{" "}
                                {item.quantity === 1
                                  ? t("checkout.bottle")
                                  : t("checkout.bottles")}
                                {item.source === "warehouse" && (
                                  <span className="ml-2 text-muted-foreground">
                                    • {t("checkout.successDirectDelivery")}
                                  </span>
                                )}
                                {item.source === "producer" && (
                                  <span className="ml-2 text-muted-foreground">
                                    • {t("checkout.successOnPallet")}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-sm font-medium text-gray-900 whitespace-nowrap tabular-nums">
                              {formatMoney(lineSek, currencyCode, appLocale)}
                            </div>
                          </div>

                          {item.product_handle ? (
                            <div className="mt-3">
                              <Link
                                href={paths.product(item.product_handle)}
                                className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:opacity-80"
                              >
                                {t("checkout.successViewProduct")}
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const shippingSek =
                    reservation.shipping_sek != null &&
                    Number.isFinite(Number(reservation.shipping_sek))
                      ? Math.round(Number(reservation.shipping_sek))
                      : Math.round(
                          (Number(reservation.shipping_cost_cents) || 0) / 100,
                        );
                  return (
                    <div className="mt-4 space-y-2 border-t border-gray-200 pt-3 text-sm">
                      {shippingSek > 0 ? (
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-gray-500">
                            {t("checkout.successShipping")}
                          </span>
                          <span className="tabular-nums text-gray-900">
                            {formatMoney(shippingSek, currencyCode, appLocale)}
                          </span>
                        </div>
                      ) : null}
                      <div
                        className="font-medium text-gray-900"
                        data-testid="success-total-incl"
                      >
                        {t("checkout.successTotalIncl", {
                          belopp: String(totalSekRounded),
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
              <CardContent className="p-0 space-y-4">
                <div className="text-lg font-medium text-gray-900">
                  {t("checkout.successWhatNext")}
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium shrink-0">
                      1
                    </div>
                    <div>{t("checkout.successStep1")}</div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium shrink-0">
                      2
                    </div>
                    <div>
                      {chargeDeadlineLabel
                        ? t("checkout.successStep2WithDeadline", {
                            datum: chargeDeadlineLabel,
                          })
                        : t("checkout.successStep2")}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium shrink-0">
                      3
                    </div>
                    <div data-testid="success-step3-delivery">
                      {t("checkout.successStep3")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() =>
                  router.push(
                    appLocale === "en"
                      ? "/en/profile/reservations"
                      : "/profile/reservations",
                  )
                }
                className="bg-black hover:bg-black/90 text-white rounded-full flex-1"
              >
                {t("checkout.successViewReservations")}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(paths.shop)}
                className="rounded-full flex-1"
              >
                {t("checkout.continueShopping")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CheckoutConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-6 pt-top-spacing">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      }
    >
      <CheckoutSuccessStripeRelay />
    </Suspense>
  );
}
