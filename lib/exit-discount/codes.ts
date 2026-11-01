import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EXIT_DISCOUNT_PERCENT,
  exitDiscountValidityDays,
} from "@/lib/exit-discount/config";

function mintCode(): string {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `PACT10-${suffix}`;
}

export type CreatedExitDiscount = {
  exitDiscountId: string;
  code: string;
  promoDiscountCodeId: string;
  expiresAt: Date;
};

/**
 * Creates a one-time 10% promo code + exit_discount_codes lead row.
 * Reuses promo_discount_codes (same mechanism as checkout).
 */
export async function createExitDiscountCode(opts: {
  sb: SupabaseClient;
  email: string;
  ageConfirmedAt: Date;
  validityDays?: number;
}): Promise<CreatedExitDiscount> {
  const email = opts.email.trim().toLowerCase();
  const days = opts.validityDays ?? exitDiscountValidityDays();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  let code = mintCode();
  let promoId: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await opts.sb
      .from("promo_discount_codes")
      .insert({
        code,
        description: "Exit popup 10% first order",
        type: "percent",
        value: EXIT_DISCOUNT_PERCENT,
        // Wine lines only — shipping is never part of the exit-discount base.
        applies_to: "item",
        purpose: "normal",
        max_uses: 1,
        max_uses_per_user: 1,
        valid_from: new Date().toISOString(),
        valid_until: expiresAt.toISOString(),
        active: true,
      })
      .select("id")
      .single();

    if (!error && data?.id) {
      promoId = data.id as string;
      break;
    }
    if (error?.code === "23505") {
      code = mintCode();
      continue;
    }
    throw new Error(error?.message || "Failed to create promo code");
  }

  if (!promoId) {
    throw new Error("Failed to mint unique promo code");
  }

  const { data: lead, error: leadErr } = await opts.sb
    .from("exit_discount_codes")
    .insert({
      email,
      code,
      promo_discount_code_id: promoId,
      age_confirmed_at: opts.ageConfirmedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (leadErr || !lead?.id) {
    await opts.sb.from("promo_discount_codes").delete().eq("id", promoId);
    throw new Error(leadErr?.message || "Failed to store exit discount lead");
  }

  return {
    exitDiscountId: lead.id as string,
    code,
    promoDiscountCodeId: promoId,
    expiresAt,
  };
}
