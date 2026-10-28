import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

const rateBuckets = new Map<string, number[]>();

function clientIpFromHeaders(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (typeof fwd === "string" && fwd.trim() !== "") {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip");
  if (typeof real === "string" && real.trim() !== "") return real.trim();
  return "unknown";
}

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(ip) ?? [];
  const pruned = prev.filter((t) => now - t < WINDOW_MS);
  if (pruned.length >= MAX_PER_WINDOW) {
    rateBuckets.set(ip, pruned);
    return false;
  }
  pruned.push(now);
  rateBuckets.set(ip, pruned);
  return true;
}

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : undefined,
  z.string().min(1).optional(),
);

const logPaymentFailureSchema = z.object({
  setup_intent_id: optionalText,
  payment_intent_id: optionalText,
  error_type: optionalText,
  error_code: optionalText,
  decline_code: optionalText,
  error_message: optionalText,
  pallet_id: optionalText,
  amount_ore: z.preprocess((value) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return Math.round(n);
    }
    return undefined;
  }, z.number().finite().optional()),
});

function buildFailureReason(
  message: string | undefined,
  amountOre: number | undefined,
): string {
  const base = (message ?? "Client-side payment authentication failed").slice(
    0,
    1800,
  );
  const suffix =
    amountOre != null && Number.isFinite(amountOre)
      ? ` [amount_ore=${Math.round(amountOre)}]`
      : "";
  return (base + suffix).slice(0, 2000);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const h = await headers();
    const ip = clientIpFromHeaders(h);

    if (!allowRequest(ip)) {
      console.warn("[log-payment-failure] rate limited", { ip });
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const parsed = logPaymentFailureSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    const body = parsed.data;

    const setupId = body.setup_intent_id;
    const paymentId = body.payment_intent_id;
    if (!setupId && !paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const sb = getSupabaseAdmin();
    const reason = buildFailureReason(body.error_message, body.amount_ore);

    let existing: {
      id: string;
      payment_attempts: number | null;
      user_id: string | null;
    } | null = null;

    if (setupId) {
      const { data, error } = await sb
        .from("order_reservations")
        .select("id, payment_attempts, user_id")
        .eq("setup_intent_id", setupId)
        .maybeSingle();
      if (error) {
        console.error("[log-payment-failure] lookup setup_intent_id:", error);
      } else if (data?.id) {
        existing = {
          id: String(data.id),
          user_id: typeof data.user_id === "string" ? data.user_id : null,
          payment_attempts:
            typeof data.payment_attempts === "number"
              ? data.payment_attempts
              : data.payment_attempts != null
                ? Number(data.payment_attempts)
                : 0,
        };
      }
    }

    if (!existing?.id && paymentId) {
      const { data, error } = await sb
        .from("order_reservations")
        .select("id, payment_attempts, user_id")
        .eq("payment_intent_id", paymentId)
        .maybeSingle();
      if (error) {
        console.error("[log-payment-failure] lookup payment_intent_id:", error);
      } else if (data?.id) {
        existing = {
          id: String(data.id),
          user_id: typeof data.user_id === "string" ? data.user_id : null,
          payment_attempts:
            typeof data.payment_attempts === "number"
              ? data.payment_attempts
              : data.payment_attempts != null
                ? Number(data.payment_attempts)
                : 0,
        };
      }
    }

    if (existing?.id && existing.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing?.id) {
      const nextAttempts = (existing.payment_attempts ?? 0) + 1;
      const { error: upErr } = await sb
        .from("order_reservations")
        .update({
          payment_status: "failed",
          stripe_decline_code: body.decline_code ?? null,
          stripe_failure_code: body.error_code ?? null,
          stripe_error_type: body.error_type ?? null,
          payment_failed_reason: reason,
          payment_attempts: nextAttempts,
          payment_last_attempt_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (upErr) {
        console.error("[log-payment-failure] update:", upErr);
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const pid = body.pallet_id;
    if (pid) {
      if (setupId) {
        const { error: insErr } = await sb.from("order_reservations").insert({
          user_id: user.id,
          pallet_id: pid,
          setup_intent_id: setupId,
          payment_mode: "setup_intent",
          payment_status: "failed",
          status: "cancelled",
          cancellation_reason: "Client-side payment authentication failed",
          cancelled_at: new Date().toISOString(),
          stripe_decline_code: body.decline_code ?? null,
          stripe_failure_code: body.error_code ?? null,
          stripe_error_type: body.error_type ?? null,
          payment_failed_reason: reason,
          payment_attempts: 1,
          payment_last_attempt_at: new Date().toISOString(),
        });
        if (insErr) {
          console.error("[log-payment-failure] insert (setup):", insErr);
        }
      } else if (paymentId) {
        const { error: insErr } = await sb.from("order_reservations").insert({
          user_id: user.id,
          pallet_id: pid,
          payment_intent_id: paymentId,
          payment_mode: "payment_intent",
          payment_status: "failed",
          status: "cancelled",
          cancellation_reason: "Client-side payment authentication failed",
          cancelled_at: new Date().toISOString(),
          stripe_decline_code: body.decline_code ?? null,
          stripe_failure_code: body.error_code ?? null,
          stripe_error_type: body.error_type ?? null,
          payment_failed_reason: reason,
          payment_attempts: 1,
          payment_last_attempt_at: new Date().toISOString(),
        });
        if (insErr) {
          console.error("[log-payment-failure] insert (payment):", insErr);
        }
      }
    } else {
      console.log(
        "[log-payment-failure] no reservation match and missing user_id/pallet_id; skipping insert",
        { setupId: !!setupId, paymentId: !!paymentId },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[log-payment-failure] unexpected:", e);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
