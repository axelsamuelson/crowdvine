"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PRODUCER_BOX_BOTTLE_COUNT,
  PRODUCER_BOX_MAX_PER_WINE,
} from "@/lib/producer-boxes/config";

interface AddProducerBoxButtonProps {
  boxId: string;
  items: { variantId: string; quantity: number }[] | null;
  label: string;
  pendingLabel: string;
  addedLabel: string;
  unavailableLabel: string;
  className?: string;
}

export function AddProducerBoxButton({
  boxId,
  items,
  label,
  pendingLabel,
  addedLabel,
  unavailableLabel,
  className,
}: AddProducerBoxButtonProps) {
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottleCount = items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const disabled =
    !items ||
    bottleCount !== PRODUCER_BOX_BOTTLE_COUNT ||
    items.some(
      (item) => item.quantity < 1 || item.quantity > PRODUCER_BOX_MAX_PER_WINE,
    );

  async function onClick() {
    if (!items || pending) return;
    setPending(true);
    setError(null);
    setAdded(false);
    try {
      const response = await fetch("/api/cart/batch-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      let result: { cart?: unknown; error?: string } = {};
      try {
        result = (await response.json()) as typeof result;
      } catch {
        /* non-JSON body */
      }
      if (!response.ok || !result.cart) {
        setError(
          typeof result.error === "string" && result.error.trim()
            ? result.error
            : unavailableLabel,
        );
        return;
      }
      window.dispatchEvent(
        new CustomEvent("cart-refresh", { detail: result.cart }),
      );
      setAdded(true);
    } catch {
      setError(unavailableLabel);
    } finally {
      setPending(false);
    }
  }

  const unavailableId = `${boxId}-unavailable`;

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <Button
        type="button"
        size="lg"
        disabled={disabled || pending}
        aria-describedby={disabled ? unavailableId : undefined}
        onClick={() => void onClick()}
        className={cn(
          "h-11 w-full rounded-md bg-black px-5 text-white hover:bg-black/90 md:w-auto",
          className,
        )}
      >
        {pending ? pendingLabel : label}
      </Button>
      {disabled ? (
        <p id={unavailableId} className="text-sm text-stone-600">
          {unavailableLabel}
        </p>
      ) : null}
      {added ? <p className="text-sm text-stone-700">{addedLabel}</p> : null}
      {error ? <p className="text-sm text-stone-700">{error}</p> : null}
    </div>
  );
}
