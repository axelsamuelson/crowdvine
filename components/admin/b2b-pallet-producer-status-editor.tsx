"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_HELP_TEXT_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import type {
  B2bPalletProducerStatusRow,
  B2bProducerDecisionStatus,
} from "@/lib/b2b-pallet-producer-status";
import { cn } from "@/lib/utils";

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type Props = {
  shipmentId: string;
  producerId: string;
  producerName: string;
  orderedQuantity: number;
  initial: B2bPalletProducerStatusRow;
};

export function B2bPalletProducerStatusEditor({
  shipmentId,
  producerId,
  producerName,
  orderedQuantity,
  initial,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [orderSentAt, setOrderSentAt] = useState(toDatetimeLocal(initial.order_sent_at));
  const [decisionStatus, setDecisionStatus] = useState<B2bProducerDecisionStatus>(
    initial.producer_decision_status,
  );
  const [decidedAt, setDecidedAt] = useState(toDatetimeLocal(initial.producer_decided_at));
  const [confirmedQty, setConfirmedQty] = useState(
    initial.confirmed_quantity != null ? String(initial.confirmed_quantity) : "",
  );
  const [pickupDate, setPickupDate] = useState(initial.pickup_date ?? "");
  const [pickupConfirmedAt, setPickupConfirmedAt] = useState(
    toDatetimeLocal(initial.pickup_date_confirmed_at),
  );
  const [goodsReadyAt, setGoodsReadyAt] = useState(toDatetimeLocal(initial.goods_ready_at));
  const [deliveredToHubAt, setDeliveredToHubAt] = useState(
    toDatetimeLocal(initial.delivered_to_hub_at),
  );
  const [invoiceReceivedAt, setInvoiceReceivedAt] = useState(
    toDatetimeLocal(initial.invoice_received_at),
  );
  const [invoicePaidAt, setInvoicePaidAt] = useState(
    toDatetimeLocal(initial.invoice_paid_at),
  );
  const [invoiceAmountCents, setInvoiceAmountCents] = useState(
    initial.invoice_amount_cents != null ? String(initial.invoice_amount_cents) : "",
  );
  const [blockedReason, setBlockedReason] = useState(initial.blocked_reason ?? "");
  const [producerNote, setProducerNote] = useState(initial.producer_note ?? "");
  const [adminNote, setAdminNote] = useState(initial.admin_note ?? "");

  const resetFromInitial = () => {
    setOrderSentAt(toDatetimeLocal(initial.order_sent_at));
    setDecisionStatus(initial.producer_decision_status);
    setDecidedAt(toDatetimeLocal(initial.producer_decided_at));
    setConfirmedQty(
      initial.confirmed_quantity != null ? String(initial.confirmed_quantity) : "",
    );
    setPickupDate(initial.pickup_date ?? "");
    setPickupConfirmedAt(toDatetimeLocal(initial.pickup_date_confirmed_at));
    setGoodsReadyAt(toDatetimeLocal(initial.goods_ready_at));
    setDeliveredToHubAt(toDatetimeLocal(initial.delivered_to_hub_at));
    setInvoiceReceivedAt(toDatetimeLocal(initial.invoice_received_at));
    setInvoicePaidAt(toDatetimeLocal(initial.invoice_paid_at));
    setInvoiceAmountCents(
      initial.invoice_amount_cents != null ? String(initial.invoice_amount_cents) : "",
    );
    setBlockedReason(initial.blocked_reason ?? "");
    setProducerNote(initial.producer_note ?? "");
    setAdminNote(initial.admin_note ?? "");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        shipment_id: shipmentId,
        producer_id: producerId,
        order_sent_at: fromDatetimeLocal(orderSentAt),
        producer_decision_status: decisionStatus,
        producer_decided_at: fromDatetimeLocal(decidedAt),
        confirmed_quantity: confirmedQty.trim() === "" ? null : Number(confirmedQty),
        pickup_date: pickupDate.trim() || null,
        pickup_date_confirmed_at: fromDatetimeLocal(pickupConfirmedAt),
        goods_ready_at: fromDatetimeLocal(goodsReadyAt),
        delivered_to_hub_at: fromDatetimeLocal(deliveredToHubAt),
        invoice_received_at: fromDatetimeLocal(invoiceReceivedAt),
        invoice_paid_at: fromDatetimeLocal(invoicePaidAt),
        invoice_amount_cents:
          invoiceAmountCents.trim() === "" ? null : Number(invoiceAmountCents),
        blocked_reason: blockedReason.trim() || null,
        producer_note: producerNote.trim() || null,
        admin_note: adminNote.trim() || null,
      };

      const res = await fetch("/api/admin/b2b-pallet-producer-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte spara");
      }
      toast.success(`Status sparad · ${producerName}`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium h-8")}
        onClick={() => setOpen(true)}
      >
        Redigera status
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Redigera · {producerName}
        </p>
        <p className={ADMIN_HELP_TEXT_CLASS}>
          Beställt: {orderedQuantity} st
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Order skickad</Label>
          <Input
            type="datetime-local"
            value={orderSentAt}
            onChange={(e) => setOrderSentAt(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Beslut</Label>
          <Select
            value={decisionStatus}
            onValueChange={(v) =>
              setDecisionStatus(v as B2bProducerDecisionStatus)
            }
          >
            <SelectTrigger className={ADMIN_FIELD_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="confirmed">confirmed</SelectItem>
              <SelectItem value="partial">partial</SelectItem>
              <SelectItem value="declined">declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Beslutat datum</Label>
          <Input
            type="datetime-local"
            value={decidedAt}
            onChange={(e) => setDecidedAt(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Bekräftad kvantitet</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={confirmedQty}
            onChange={(e) => setConfirmedQty(e.target.value)}
            className={ADMIN_FIELD_CLASS}
            placeholder={String(orderedQuantity)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Upphämtningsdatum</Label>
          <Input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Upphämtning bekräftad</Label>
          <Input
            type="datetime-local"
            value={pickupConfirmedAt}
            onChange={(e) => setPickupConfirmedAt(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Gods klart</Label>
          <Input
            type="datetime-local"
            value={goodsReadyAt}
            onChange={(e) => setGoodsReadyAt(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Hub Delivery</Label>
          <Input
            type="datetime-local"
            value={deliveredToHubAt}
            onChange={(e) => setDeliveredToHubAt(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Faktura mottagen</Label>
          <Input
            type="datetime-local"
            value={invoiceReceivedAt}
            onChange={(e) => setInvoiceReceivedAt(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Faktura betald</Label>
          <Input
            type="datetime-local"
            value={invoicePaidAt}
            onChange={(e) => setInvoicePaidAt(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={ADMIN_LABEL_CLASS}>Fakturabelopp (öre)</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={invoiceAmountCents}
            onChange={(e) => setInvoiceAmountCents(e.target.value)}
            className={ADMIN_FIELD_CLASS}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className={ADMIN_LABEL_CLASS}>Blockeringsorsak</Label>
        <Input
          value={blockedReason}
          onChange={(e) => setBlockedReason(e.target.value)}
          className={ADMIN_FIELD_CLASS}
          placeholder="Tom = inte blockerad"
        />
      </div>
      <div className="space-y-1.5">
        <Label className={ADMIN_LABEL_CLASS}>Producentanteckning</Label>
        <Textarea
          value={producerNote}
          onChange={(e) => setProducerNote(e.target.value)}
          className={cn(ADMIN_FIELD_CLASS, "min-h-[72px]")}
        />
      </div>
      <div className="space-y-1.5">
        <Label className={ADMIN_LABEL_CLASS}>Adminanteckning</Label>
        <Textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          className={cn(ADMIN_FIELD_CLASS, "min-h-[72px]")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className={cn(ADMIN_PRIMARY_BUTTON_CLASS, "text-xs font-medium h-8")}
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Sparar…" : "Spara"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium h-8")}
          disabled={saving}
          onClick={() => {
            resetFromInitial();
            setOpen(false);
          }}
        >
          Avbryt
        </Button>
      </div>
    </div>
  );
}
