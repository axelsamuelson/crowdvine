"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type InquiryLine = {
  id: string;
  wine_id: string;
  wine_title: string;
  quantity: number;
  unit_price_cents: number | null;
};

type Inquiry = {
  id: string;
  created_at: string;
  status: "new" | "confirmed" | "rejected";
  company_name: string;
  organization_number: string;
  contact_name: string;
  email: string;
  phone: string;
  delivery_address: string;
  postal_code: string;
  desired_delivery_date: string | null;
  message: string | null;
  b2b_inquiry_lines: InquiryLine[] | null;
};

const STATUS_LABEL: Record<Inquiry["status"], string> = {
  new: "Ny",
  confirmed: "Bekräftad",
  rejected: "Avböjd",
};

export function B2bInquiriesAdminClient() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/b2b-inquiries");
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();
      setInquiries(data.inquiries ?? []);
    } catch {
      toast.error("Kunde inte hämta förfrågningar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: Inquiry["status"]) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/b2b-inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("update failed");
      setInquiries((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status } : row)),
      );
      toast.success(`Status: ${STATUS_LABEL[status]}`);
    } catch {
      toast.error("Kunde inte uppdatera status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Laddar…</p>;
  }

  if (inquiries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Inga förfrågningar ännu.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Uppdatera
        </Button>
      </div>
      <ul className="space-y-4">
        {inquiries.map((inq) => (
          <li
            key={inq.id}
            className="rounded-md border border-border bg-card p-4 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {inq.company_name}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({inq.organization_number})
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {inq.contact_name} · {inq.email} · {inq.phone}
                </p>
                <p className="text-sm text-muted-foreground">
                  {inq.delivery_address}, {inq.postal_code}
                  {inq.desired_delivery_date
                    ? ` · önskat ${inq.desired_delivery_date}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(inq.created_at).toLocaleString("sv-SE")} ·{" "}
                  {inq.id.slice(0, 8)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={inq.status}
                  disabled={updatingId === inq.id}
                  onValueChange={(v) =>
                    void updateStatus(inq.id, v as Inquiry["status"])
                  }
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Ny</SelectItem>
                    <SelectItem value="confirmed">Bekräftad</SelectItem>
                    <SelectItem value="rejected">Avböjd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {inq.message && (
              <p className="text-sm whitespace-pre-wrap border-l-2 pl-3 text-muted-foreground">
                {inq.message}
              </p>
            )}
            <ul className="text-sm space-y-1">
              {(inq.b2b_inquiry_lines ?? []).map((line) => (
                <li key={line.id}>
                  {line.wine_title} × {line.quantity}
                  {line.unit_price_cents != null
                    ? ` · ${(line.unit_price_cents / 100).toFixed(0)} kr exkl.`
                    : ""}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
