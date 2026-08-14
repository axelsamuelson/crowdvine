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
import type { B2bProducerDecisionStatus } from "@/lib/b2b-pallet-producer-status";

function toDatetimeLocal(iso: string | null | undefined): string {
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

type Initial = {
  producer_decision_status: B2bProducerDecisionStatus;
  producer_decided_at: string | null;
  confirmed_quantity: number | null;
  pickup_date: string | null;
  pickup_date_confirmed_at: string | null;
  goods_ready_at: string | null;
  producer_note: string | null;
};

type Props = {
  shipmentId: string;
  orderedQuantity: number;
  initial: Initial;
  accessToken?: string | null;
};

export function ProducerB2bPalletStatusEditor({
  shipmentId,
  orderedQuantity,
  initial,
  accessToken = null,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [decisionStatus, setDecisionStatus] = useState(initial.producer_decision_status);
  const [confirmedQty, setConfirmedQty] = useState(
    initial.confirmed_quantity != null ? String(initial.confirmed_quantity) : "",
  );
  const [pickupDate, setPickupDate] = useState(initial.pickup_date ?? "");
  const [pickupConfirmedAt, setPickupConfirmedAt] = useState(
    toDatetimeLocal(initial.pickup_date_confirmed_at),
  );
  const [goodsReadyAt, setGoodsReadyAt] = useState(
    toDatetimeLocal(initial.goods_ready_at),
  );
  const [producerNote, setProducerNote] = useState(initial.producer_note ?? "");

  const reset = () => {
    setDecisionStatus(initial.producer_decision_status);
    setConfirmedQty(
      initial.confirmed_quantity != null ? String(initial.confirmed_quantity) : "",
    );
    setPickupDate(initial.pickup_date ?? "");
    setPickupConfirmedAt(toDatetimeLocal(initial.pickup_date_confirmed_at));
    setGoodsReadyAt(toDatetimeLocal(initial.goods_ready_at));
    setProducerNote(initial.producer_note ?? "");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/producer/b2b-pallets/${shipmentId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { "x-b2b-pallet-token": accessToken } : {}),
        },
        body: JSON.stringify({
          producer_decision_status: decisionStatus,
          confirmed_quantity:
            confirmedQty.trim() === "" ? null : Number(confirmedQty),
          pickup_date: pickupDate.trim() || null,
          pickup_date_confirmed_at: fromDatetimeLocal(pickupConfirmedAt),
          goods_ready_at: fromDatetimeLocal(goodsReadyAt),
          producer_note: producerNote.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Could not save");
      toast.success("Status saved");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
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
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        Update status
      </Button>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-900">
        Update your fulfilment status
      </p>
      <p className="text-xs text-gray-500">Ordered: {orderedQuantity} bottles</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Decision</Label>
          <Select
            value={decisionStatus}
            onValueChange={(v) =>
              setDecisionStatus(v as B2bProducerDecisionStatus)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Confirmed quantity</Label>
          <Input
            type="number"
            min={0}
            step={1}
            value={confirmedQty}
            onChange={(e) => setConfirmedQty(e.target.value)}
            placeholder={String(orderedQuantity)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Pickup date</Label>
          <Input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Pickup confirmed</Label>
          <Input
            type="datetime-local"
            value={pickupConfirmedAt}
            onChange={(e) => setPickupConfirmedAt(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Goods ready</Label>
          <Input
            type="datetime-local"
            value={goodsReadyAt}
            onChange={(e) => setGoodsReadyAt(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Your note</Label>
        <Textarea
          value={producerNote}
          onChange={(e) => setProducerNote(e.target.value)}
          className="min-h-[72px]"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full bg-black text-white hover:bg-black/90"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={saving}
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
