/**
 * Pure admin badge model for fulfillment vs billing hold.
 * Client-safe — no next/headers or Supabase imports.
 */

import {
  DISPATCH_STATUS_LABELS_SV,
  isDirectBoxDispatchStatus,
  normalizeDispatchStatus,
} from "@/lib/commerce/direct-box-dispatch";

export type AdminFulfillmentBadge =
  | { kind: "fulfillment"; label: string; title?: string }
  | { kind: "charge_hold"; label: string; title: string }
  | null;

const CHANNEL_LABEL_SV: Record<string, string> = {
  direct_box: "Direktleverans",
  shared_pallet: "Delad pall",
};

function dispatchStatusLabelSv(dispatch: string): string {
  if (isDirectBoxDispatchStatus(dispatch)) {
    return DISPATCH_STATUS_LABELS_SV[dispatch];
  }
  return dispatch;
}

/** Never labels DIRECT_BOX handoff as Charge hold. */
export function resolveAdminFulfillmentDisplay(row: {
  fulfillment_channel?: string | null;
  fulfillment_dispatch_status?: string | null;
  charge_blocked_reason?: string | null;
}): AdminFulfillmentBadge[] {
  const out: AdminFulfillmentBadge[] = [];
  const dispatch = String(row.fulfillment_dispatch_status ?? "").trim();
  const channel = String(row.fulfillment_channel ?? "").trim();
  const hold = String(row.charge_blocked_reason ?? "").trim();

  const channelLabel = CHANNEL_LABEL_SV[channel] ?? channel;

  if (dispatch) {
    const statusLabel = dispatchStatusLabelSv(dispatch);
    out.push({
      kind: "fulfillment",
      label:
        channel === "direct_box"
          ? `${channelLabel}: ${statusLabel}`
          : `Fulfillment: ${statusLabel}`,
      title: dispatch,
    });
  } else if (channel === "direct_box") {
    const pending = DISPATCH_STATUS_LABELS_SV[
      normalizeDispatchStatus(null)
    ];
    out.push({
      kind: "fulfillment",
      label: `${channelLabel}: ${pending}`,
      title: "pending_manual_handoff",
    });
  }

  if (hold === "DIRECT_BOX_FULFILLMENT_PENDING") {
    out.push({
      kind: "fulfillment",
      label: "Fulfillment: pending manual handoff (legacy)",
      title: "Legacy handoff marker (not a billing hold)",
    });
  } else if (hold) {
    out.push({
      kind: "charge_hold",
      label: `Charge hold: ${hold}`,
      title: hold,
    });
  }

  return out;
}
