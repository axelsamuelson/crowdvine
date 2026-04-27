"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ProfilePaymentMethodRow {
  id: string;
  type: "card" | "bank";
  last4?: string;
  brand?: string;
  is_default: boolean;
  expiry_month?: number;
  expiry_year?: number;
}

function readErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (typeof o.details === "string" && o.details.trim() !== "") return o.details;
  if (typeof o.error === "string" && o.error.trim() !== "") return o.error;
  return null;
}

interface PaymentMethodsSectionProps {
  onCountChange?: (count: number) => void;
}

export function PaymentMethodsSection({
  onCountChange,
}: PaymentMethodsSectionProps) {
  const [methods, setMethods] = useState<ProfilePaymentMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setActionError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/payment-methods");
      if (res.status === 404) {
        setMethods([]);
        return;
      }
      if (!res.ok) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        setActionError(
          readErrorMessage(body) ?? "Could not load payment methods.",
        );
        setMethods([]);
        return;
      }
      const data: unknown = await res.json();
      const list =
        data &&
        typeof data === "object" &&
        "paymentMethods" in data &&
        Array.isArray((data as { paymentMethods: unknown }).paymentMethods)
          ? (data as { paymentMethods: ProfilePaymentMethodRow[] })
              .paymentMethods
          : [];
      setMethods(list);
    } catch {
      setActionError("Could not load payment methods.");
      setMethods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onCountChange?.(methods.length);
  }, [methods.length, onCountChange]);

  const handleSetDefault = async (id: string) => {
    setActionError(null);
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/user/payment-methods/${encodeURIComponent(id)}/set-default`,
        { method: "PATCH" },
      );
      if (!res.ok) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        setActionError(
          readErrorMessage(body) ?? "Could not set default card.",
        );
        return;
      }
      setMethods((prev) =>
        prev.map((m) => ({
          ...m,
          is_default: m.id === id,
        })),
      );
    } catch {
      setActionError("Could not set default card.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (
      !window.confirm(
        "Remove this card? This cannot be undone and may affect pending reservations.",
      )
    ) {
      return;
    }
    setActionError(null);
    setBusyId(id);
    try {
      const res = await fetch(
        `/api/user/payment-methods/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        setActionError(readErrorMessage(body) ?? "Could not remove card.");
        return;
      }
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setActionError("Could not remove card.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-md border border-border bg-popover px-4 py-3 space-y-3">
        <div className="animate-pulse h-4 w-40 rounded bg-muted" />
        <div className="animate-pulse h-14 w-full rounded bg-muted" />
        <div className="animate-pulse h-14 w-full rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="rounded-md border border-border bg-popover px-4">
        {methods.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">
              No saved payment methods
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Add a payment method at checkout when placing your next
              reservation.
            </p>
          </div>
        ) : (
          methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-b-0"
            >
              <div className="min-w-0 flex items-center gap-3">
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
                  {(method.brand ?? "Card").toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    •••• {method.last4 ?? "····"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {method.expiry_month ?? "—"}/
                    {method.expiry_year ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                {method.is_default ? (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 border-0">
                    Default
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-2"
                    disabled={busyId !== null}
                    onClick={() => void handleSetDefault(method.id)}
                  >
                    Set as default
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={busyId !== null}
                  onClick={() => void handleRemove(method.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
