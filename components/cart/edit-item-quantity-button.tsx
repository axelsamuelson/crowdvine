"use client";

import { Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { CartItem } from "@/lib/shopify/types";
import { useCart } from "./cart-context";
import { useRef, useCallback } from "react";

function SubmitButton({ type, onClick }: { type: "plus" | "minus"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        type === "plus" ? "Increase item quantity" : "Reduce item quantity"
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

export function EditItemQuantityButton({
  item,
  type,
}: {
  item: CartItem;
  type: "plus" | "minus";
}) {
  const { updateItem } = useCart();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingQuantityRef = useRef(item.quantity);

  const handleClick = useCallback(() => {
    // Calculate next quantity
    const nextQuantity = type === "plus" 
      ? pendingQuantityRef.current + 1 
      : pendingQuantityRef.current - 1;
    
    // Don't allow quantity below 1
    if (nextQuantity < 1) return;
    
    // Update pending quantity
    pendingQuantityRef.current = nextQuantity;
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer - only call API after 300ms of no clicks
    debounceTimerRef.current = setTimeout(() => {
      console.log("🛒 [DEBOUNCE] Updating item to quantity:", nextQuantity);
      updateItem(item.id, item.merchandise.id, nextQuantity, type);
    }, 300);
  }, [item.id, item.merchandise.id, type, updateItem]);

  return <SubmitButton type={type} onClick={handleClick} />;
}
