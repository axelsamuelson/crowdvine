"use client";

import { Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { CartItem } from "@/lib/shopify/types";
import { useCart } from "./cart-context";
import { useRef, useCallback, useEffect } from "react";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { BOTTLE_PACK_SIZE } from "@/lib/cart/bottle-pack";

function SubmitButton({
  type,
  onClick,
}: {
  type: "plus" | "minus";
  onClick: () => void;
}) {
  const { t } = useTranslations();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        type === "plus"
          ? t("cart.quantityIncrease")
          : t("cart.quantityDecrease")
      }
      className={clsx(
        "ease flex h-full min-w-[36px] max-w-[36px] flex-none items-center justify-center rounded-full p-2 transition-all duration-200 hover:border-neutral-800 hover:opacity-80",
        {
          "ml-auto": type === "minus",
        },
      )}
    >
      {type === "plus" ? (
        <Plus className="h-4 w-4" />
      ) : (
        <Minus className="h-4 w-4" />
      )}
    </button>
  );
}

function nextB2BPackQuantity(current: number, type: "plus" | "minus"): number {
  if (type === "plus") {
    if (current % BOTTLE_PACK_SIZE === 0) {
      return current + BOTTLE_PACK_SIZE;
    }
    return Math.ceil(current / BOTTLE_PACK_SIZE) * BOTTLE_PACK_SIZE;
  }

  if (current % BOTTLE_PACK_SIZE === 0) {
    return Math.max(0, current - BOTTLE_PACK_SIZE);
  }
  return Math.floor(current / BOTTLE_PACK_SIZE) * BOTTLE_PACK_SIZE;
}

export function EditItemQuantityButton({
  item,
  type,
}: {
  item: CartItem;
  type: "plus" | "minus";
}) {
  const { updateItem } = useCart();
  const isB2B = useB2BPriceMode();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingQuantityRef = useRef(item.quantity);

  // Keep each button's ref in sync with the actual item quantity.
  // (Plus and minus are separate components, so they must both stay up to date.)
  useEffect(() => {
    pendingQuantityRef.current = item.quantity;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [item.quantity]);

  const handleClick = useCallback(() => {
    const nextQuantity = isB2B
      ? nextB2BPackQuantity(pendingQuantityRef.current, type)
      : type === "plus"
        ? pendingQuantityRef.current + 1
        : pendingQuantityRef.current - 1;

    // Don't allow quantity below 1 (0 removes the line on B2B pack step-down)
    if (nextQuantity < 0) return;
    if (!isB2B && nextQuantity < 1) return;

    // Update pending quantity
    pendingQuantityRef.current = nextQuantity;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer - only call API after 300ms of no clicks
    debounceTimerRef.current = setTimeout(() => {
      console.log("🛒 [DEBOUNCE] Updating item to quantity:", nextQuantity);
      updateItem(
        item.id,
        item.merchandise.id,
        nextQuantity,
        nextQuantity === 0 ? "delete" : type,
      );
    }, 300);
  }, [item.id, item.merchandise.id, type, updateItem, isB2B]);

  return <SubmitButton type={type} onClick={handleClick} />;
}
