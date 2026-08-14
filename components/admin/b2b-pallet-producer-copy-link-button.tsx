"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";

type Props = {
  shipmentId: string;
  producerId: string;
};

export function B2bPalletProducerCopyLinkButton({
  shipmentId,
  producerId,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/b2b-pallet-shipments/${shipmentId}/producer-share-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ producer_id: producerId }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte skapa länk");
      }

      const url =
        typeof json.url === "string"
          ? json.url
          : typeof json.path === "string"
            ? `${window.location.origin}${json.path}`
            : null;
      if (!url) throw new Error("Ingen länk returnerades");

      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Länk kopierad");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte kopiera länk");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "h-8 text-xs font-medium")}
      disabled={busy}
      onClick={() => void copyLink()}
    >
      {copied ? (
        <Check className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <Link2 className="mr-1.5 h-3.5 w-3.5" />
      )}
      {busy ? "Skapar…" : copied ? "Kopierad" : "Copy link"}
    </Button>
  );
}
