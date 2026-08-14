export type FunnelStepBadge = {
  key: string;
  label: string;
  className: string;
};

/** Shared colored badges for Nära köp + Användare furthest-step. */
export function getFunnelStepBadge(step: string): FunnelStepBadge {
  if (step.startsWith("abandoned:") || step === "abandoned") {
    return {
      key: "abandoned",
      label: step.startsWith("abandoned:")
        ? step
            .replace("abandoned:", "Övergiven · ")
            .replace("payment_ready", "betalning")
            .replace("delivery", "leverans")
        : "Övergiven",
      className:
        "border-transparent bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
    };
  }
  if (step.startsWith("checkout:") || step === "checkout_started") {
    return {
      key: "checkout",
      label: step.startsWith("checkout:")
        ? step
            .replace("checkout:", "Checkout · ")
            .replace("payment_ready", "betalning")
            .replace("delivery", "leverans")
        : "Checkout",
      className:
        "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
    };
  }
  if (step === "add_to_cart" || step === "first_add_to_cart") {
    return {
      key: "add_to_cart",
      label: "Varukorg",
      className:
        "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    };
  }
  if (step === "reservation_completed" || step === "reservation") {
    return {
      key: "reservation",
      label: "Reservation",
      className:
        "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    };
  }
  if (step === "product_view" || step === "first_product_view") {
    return {
      key: "product_view",
      label: "Produktvy",
      className:
        "border-transparent bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
    };
  }
  if (step === "first_login" || step === "login") {
    return {
      key: "login",
      label: "Inloggad",
      className:
        "border-transparent bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200",
    };
  }
  return {
    key: "none",
    label: "Ingen aktivitet",
    className:
      "border-transparent bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
}

/** Furthest logged-in funnel step from journey timestamps. */
export function furthestLoggedInStep(user: {
  reservation_completed_at?: string | null;
  checkout_started_at?: string | null;
  first_add_to_cart_at?: string | null;
  first_product_view_at?: string | null;
  first_login_at?: string | null;
  has_no_events?: boolean;
}): string {
  if (user.has_no_events) return "none";
  if (user.reservation_completed_at) return "reservation_completed";
  if (user.checkout_started_at) return "checkout_started";
  if (user.first_add_to_cart_at) return "add_to_cart";
  if (user.first_product_view_at) return "product_view";
  if (user.first_login_at) return "first_login";
  return "none";
}
