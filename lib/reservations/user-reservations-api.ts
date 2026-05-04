/**
 * Shared types + helpers for GET /api/user/reservations (multi-geo + market drops).
 */

export type BottleVerb = "requested" | "ordered";

export type ReservationSummaryGroup = {
  groupKey: string;
  displayTitle: string;
  displayDestination: string;
  bottleCount: number;
  reservationCount: number;
  statusSummary: string;
  isConditional: boolean;
  bottleVerb: BottleVerb | "mixed";
  latestCreatedAt: string;
};

export type UserReservationsApiPayload = {
  reservations: unknown[];
  summaryGroups: ReservationSummaryGroup[];
};

export function normalizeUserReservationsResponse(
  data: unknown,
): UserReservationsApiPayload {
  if (Array.isArray(data)) {
    return { reservations: data, summaryGroups: [] };
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const reservations = Array.isArray(o.reservations)
      ? o.reservations
      : [];
    const summaryGroups = Array.isArray(o.summaryGroups)
      ? (o.summaryGroups as ReservationSummaryGroup[])
      : [];
    return { reservations, summaryGroups };
  }
  return { reservations: [], summaryGroups: [] };
}

type SlimReservation = {
  id: string;
  created_at: string;
  status: string;
  payment_status?: string | null;
  bottle_count: number;
  is_conditional: boolean;
  bottle_verb: BottleVerb;
  customer_pallet_label: string;
  display_destination: string | null;
  market_drop_id?: string | null;
  pallet_id?: string | null;
  delivery_address?: string;
};

function statusSummaryFromReservation(status: string, payment?: string | null): string {
  const s = String(status || "");
  const p = String(payment || "");
  if (s === "conditional_pending") return "Pending legal / logistics review";
  if (s === "pending_producer_approval") return "Pending producer approval";
  if (p === "pending" || s === "pending_payment") return "Payment pending";
  if (s === "approved" || s === "placed") return "Approved / placed";
  if (s === "partly_approved") return "Partly approved";
  if (s === "confirmed") return "Confirmed";
  if (s) return s.replace(/_/g, " ");
  return "Active";
}

/** Aggregate reservations for header / dashboards (grouped by market drop when present). */
export function buildReservationSummaryGroups(
  rows: SlimReservation[],
): ReservationSummaryGroup[] {
  const map = new Map<
    string,
    {
      groupKey: string;
      displayTitle: string;
      displayDestination: string;
      bottleCount: number;
      reservationCount: number;
      hasConditional: boolean;
      hasNonConditional: boolean;
      latestCreatedAt: string;
      latestStatus: string;
      latestPayment: string | null;
    }
  >();

  for (const r of rows) {
    const key = r.market_drop_id?.trim()
      ? `md:${r.market_drop_id.trim()}`
      : `leg:${r.pallet_id ?? "na"}|${(r.delivery_address || "").slice(0, 96)}`;

    const title = r.customer_pallet_label?.trim() || "Your reservation";
    const dest =
      r.display_destination?.trim() ||
      title.replace(/\s+pallet$/i, "").trim() ||
      "—";

    if (!map.has(key)) {
      map.set(key, {
        groupKey: key,
        displayTitle: title,
        displayDestination: dest,
        bottleCount: 0,
        reservationCount: 0,
        hasConditional: false,
        hasNonConditional: false,
        latestCreatedAt: r.created_at,
        latestStatus: r.status,
        latestPayment: r.payment_status ?? null,
      });
    }
    const g = map.get(key)!;
    g.bottleCount += r.bottle_count;
    g.reservationCount += 1;
    if (r.is_conditional) g.hasConditional = true;
    else g.hasNonConditional = true;

    const rd = new Date(r.created_at).getTime();
    const gd = new Date(g.latestCreatedAt).getTime();
    if (!Number.isNaN(rd) && !Number.isNaN(gd) && rd >= gd) {
      g.latestCreatedAt = r.created_at;
      g.latestStatus = r.status;
      g.latestPayment = r.payment_status ?? null;
    }
  }

  return Array.from(map.values())
    .map((g) => {
      let bottleVerb: BottleVerb | "mixed" = "ordered";
      if (g.hasConditional && !g.hasNonConditional) bottleVerb = "requested";
      else if (g.hasConditional && g.hasNonConditional) bottleVerb = "mixed";
      else bottleVerb = "ordered";

      return {
        groupKey: g.groupKey,
        displayTitle: g.displayTitle,
        displayDestination: g.displayDestination,
        bottleCount: g.bottleCount,
        reservationCount: g.reservationCount,
        statusSummary: statusSummaryFromReservation(
          g.latestStatus,
          g.latestPayment,
        ),
        isConditional: g.hasConditional,
        bottleVerb,
        latestCreatedAt: g.latestCreatedAt,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latestCreatedAt).getTime() -
        new Date(a.latestCreatedAt).getTime(),
    );
}
