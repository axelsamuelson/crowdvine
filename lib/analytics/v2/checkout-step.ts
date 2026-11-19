/**
 * JS mirror of SQL analytics_checkout_step(meta jsonb).
 * Named steps: postal | delivery | age_terms | payment.
 * Also maps legacy numeric step and phase values.
 */

export const CHECKOUT_STEPS = [
  "postal",
  "delivery",
  "age_terms",
  "payment",
] as const;

/** Ordered steps for admin funnel / kassasteg tables. */
export const CHECKOUT_STEP_ORDER = CHECKOUT_STEPS;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export type CheckoutStepMeta = {
  step?: string | null;
  phase?: string | null;
  [key: string]: unknown;
};

/**
 * Resolve checkout step from event_metadata (or a plain step/phase object).
 * Returns null when neither step nor phase maps (UI: "Okänt steg").
 */
export function analyticsCheckoutStep(
  meta: CheckoutStepMeta | Record<string, unknown> | null | undefined,
): CheckoutStep | null {
  if (!meta || typeof meta !== "object") return null;

  const stepRaw = meta.step;
  const step =
    typeof stepRaw === "string" || typeof stepRaw === "number"
      ? String(stepRaw)
      : null;

  if (
    step === "postal" ||
    step === "delivery" ||
    step === "age_terms" ||
    step === "payment"
  ) {
    return step;
  }
  if (step === "1") return "postal";
  if (step === "2") return "delivery";
  if (step === "3") return "age_terms";
  if (step === "4") return "payment";

  const phaseRaw = meta.phase;
  const phase =
    typeof phaseRaw === "string" ? phaseRaw : null;

  if (phase === "compliance") return "age_terms";
  if (phase === "payment" || phase === "payment_ready") return "payment";
  if (phase === "delivery") return "delivery";

  return null;
}
