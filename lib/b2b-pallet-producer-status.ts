/** Shared types for B2B pallet per-producer fulfilment status (admin). */

export type B2bProducerDecisionStatus =
  | "pending"
  | "confirmed"
  | "partial"
  | "declined";

export type B2bWineDecisionStatus = "pending" | "confirmed" | "declined";

export type B2bPalletProducerStatusRow = {
  id?: string;
  shipment_id: string;
  producer_id: string;
  order_sent_at: string | null;
  producer_decision_status: B2bProducerDecisionStatus;
  producer_decided_at: string | null;
  confirmed_quantity: number | null;
  pickup_date: string | null;
  pickup_date_confirmed_at: string | null;
  goods_ready_at: string | null;
  delivered_to_hub_at: string | null;
  invoice_received_at: string | null;
  invoice_paid_at: string | null;
  invoice_amount_cents: number | null;
  blocked_reason: string | null;
  producer_note: string | null;
  admin_note: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type B2bPalletWineDecision = {
  wineId: string;
  decisionStatus: B2bWineDecisionStatus;
  confirmedQuantity: number | null;
  rejectReason: string | null;
  decidedAt: string | null;
};

export type B2bPalletStatusWine = {
  wineId: string;
  wineName: string;
  vintage: string | null;
  quantity: number;
  decisionStatus: B2bWineDecisionStatus;
  confirmedQuantity: number | null;
  rejectReason: string | null;
  decidedAt: string | null;
};

export type B2bPalletStatusProducerGroup = {
  producerId: string;
  producerName: string;
  orderedQuantity: number;
  wines: B2bPalletStatusWine[];
  status: B2bPalletProducerStatusRow;
};

export function emptyProducerStatus(
  shipmentId: string,
  producerId: string,
): B2bPalletProducerStatusRow {
  return {
    shipment_id: shipmentId,
    producer_id: producerId,
    order_sent_at: null,
    producer_decision_status: "pending",
    producer_decided_at: null,
    confirmed_quantity: null,
    pickup_date: null,
    pickup_date_confirmed_at: null,
    goods_ready_at: null,
    delivered_to_hub_at: null,
    invoice_received_at: null,
    invoice_paid_at: null,
    invoice_amount_cents: null,
    blocked_reason: null,
    producer_note: null,
    admin_note: null,
  };
}

export function isProducerConfirmed(
  status: B2bPalletProducerStatusRow,
): boolean {
  return (
    status.producer_decision_status === "confirmed" ||
    status.producer_decision_status === "partial"
  );
}

/**
 * Current process step for a producer on a B2B pallet
 * (Order sent → Confirmed → Hub Delivery).
 */
export function getProducerProcessStep(
  status: Pick<
    B2bPalletProducerStatusRow,
    | "order_sent_at"
    | "producer_decision_status"
    | "delivered_to_hub_at"
  >,
): {
  label: string;
  tone: "pending" | "active" | "done" | "rejected";
} {
  if (status.producer_decision_status === "declined") {
    return { label: "Rejected", tone: "rejected" };
  }
  if (status.delivered_to_hub_at) {
    return { label: "Delivered to Hub", tone: "done" };
  }
  if (isProducerConfirmed(status as B2bPalletProducerStatusRow)) {
    return { label: "Awaiting Hub Delivery", tone: "active" };
  }
  if (status.order_sent_at || status.producer_decision_status === "pending") {
    return { label: "Awaiting confirmation", tone: "active" };
  }
  return { label: "Order sent", tone: "pending" };
}

export type B2bPalletProducerProgressRow = {
  producerId: string;
  producerName: string;
  bottleCount: number;
  stepLabel: string;
  stepTone: "pending" | "active" | "done" | "rejected";
};

/** Roll up per-wine decisions into producer-level decision + confirmed qty. */
export function rollupWineDecisions(
  wines: Array<{
    quantity: number;
    decisionStatus: B2bWineDecisionStatus;
    confirmedQuantity?: number | null;
  }>,
): {
  producer_decision_status: B2bProducerDecisionStatus;
  confirmed_quantity: number | null;
} {
  if (wines.length === 0) {
    return { producer_decision_status: "pending", confirmed_quantity: null };
  }
  const anyPending = wines.some((w) => w.decisionStatus === "pending");
  if (anyPending) {
    return { producer_decision_status: "pending", confirmed_quantity: null };
  }
  const confirmed = wines.filter((w) => w.decisionStatus === "confirmed");
  const declined = wines.filter((w) => w.decisionStatus === "declined");
  const confirmedQty = confirmed.reduce((sum, w) => {
    const q =
      w.confirmedQuantity != null && w.confirmedQuantity >= 0
        ? w.confirmedQuantity
        : w.quantity;
    return sum + q;
  }, 0);

  if (confirmed.length === wines.length) {
    return {
      producer_decision_status: "confirmed",
      confirmed_quantity: confirmedQty,
    };
  }
  if (declined.length === wines.length) {
    return { producer_decision_status: "declined", confirmed_quantity: 0 };
  }
  return {
    producer_decision_status: "partial",
    confirmed_quantity: confirmedQty,
  };
}

export type B2bPalletProgressSummary = {
  producerCount: number;
  /** Producers with an effective order (on pallet / order sent). */
  orderSent: number;
  /** confirmed or partial */
  confirmed: number;
  declined: number;
  hubDelivered: number;
  /** All non-declined producers have delivered to hub. */
  palletAssembled: boolean;
  /** Shipment has shipped_at set. */
  palletShipped: boolean;
  invoiceReceived: number;
  invoicePaid: number;
};

/** Aggregate fulfilment across all producers on a B2B pallet. */
export function summarizeB2bPalletProgress(
  producerIds: string[],
  statusByProducer: Map<string, B2bPalletProducerStatusRow>,
  options?: {
    /** When true, every producer on the pallet counts as order-sent (wine added). */
    treatOnPalletAsOrderSent?: boolean;
    shippedAt?: string | null;
  },
): B2bPalletProgressSummary {
  const treatOnPalletAsOrderSent = options?.treatOnPalletAsOrderSent ?? true;
  const uniqueIds = Array.from(new Set(producerIds.filter(Boolean)));
  let orderSent = 0;
  let confirmed = 0;
  let declined = 0;
  let hubDelivered = 0;
  let needHub = 0;
  let hubDoneAmongActive = 0;
  let invoiceReceived = 0;
  let invoicePaid = 0;

  for (const producerId of uniqueIds) {
    const s = statusByProducer.get(producerId);
    if (treatOnPalletAsOrderSent || s?.order_sent_at) orderSent += 1;
    if (s && isProducerConfirmed(s)) confirmed += 1;
    if (s?.producer_decision_status === "declined") {
      declined += 1;
    } else {
      needHub += 1;
      if (s?.delivered_to_hub_at) hubDoneAmongActive += 1;
    }
    if (s?.delivered_to_hub_at) hubDelivered += 1;
    if (s?.invoice_received_at) invoiceReceived += 1;
    if (s?.invoice_paid_at) invoicePaid += 1;
  }

  return {
    producerCount: uniqueIds.length,
    orderSent,
    confirmed,
    declined,
    hubDelivered,
    palletAssembled: needHub > 0 && hubDoneAmongActive === needHub,
    palletShipped: !!options?.shippedAt,
    invoiceReceived,
    invoicePaid,
  };
}
