/**
 * Pure admin badge model for fulfillment vs billing hold.
 * Client-safe — no next/headers or Supabase imports.
 */

export type AdminFulfillmentBadge =
  | { kind: "fulfillment"; label: string; title?: string }
  | { kind: "charge_hold"; label: string; title: string }
  | null;

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

  if (dispatch) {
    out.push({
      kind: "fulfillment",
      label: `Fulfillment: ${dispatch}`,
      title: dispatch,
    });
  } else if (channel === "direct_box") {
    out.push({
      kind: "fulfillment",
      label: "Fulfillment: direct_box (dispatch unset)",
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
