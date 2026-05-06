import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

type LogPaymentFailureBody = {
  setup_intent_id?: string;
  payment_intent_id?: string;
  error_type?: string;
  error_code?: string;
  decline_code?: string;
  error_message?: string;
  pallet_id?: string;
  user_id?: string;
  amount_ore?: number;
};

function parseLogBody(raw: unknown): LogPaymentFailureBody | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (k: string): string | undefined => {
    const v = o[k];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
  };
  let amountOre: number | undefined;
  if (typeof o.amount_ore === "number" && Number.isFinite(o.amount_ore)) {
    amountOre = Math.round(o.amount_ore);
  } else if (typeof o.amount_ore === "string" && o.amount_ore.trim() !== "") {
    const n = Number(o.amount_ore);
    if (Number.isFinite(n)) amountOre = Math.round(n);
  }
  return {
    setup_intent_id: str("setup_intent_id"),
    payment_intent_id: str("payment_intent_id"),
    error_type: str("error_type"),
    error_code: str("error_code"),
    decline_code: str("decline_code"),
    error_message: str("error_message"),
    pallet_id: str("pallet_id"),
    user_id: str("user_id"),
    amount_ore: amountOre,
  };
}

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

    const body = parseLogBody(raw);
    if (!body) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const setupId = body.setup_intent_id;
    const paymentId = body.payment_intent_id;
    if (!setupId && !paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const sb = getSupabaseAdmin();
    const reason = buildFailureReason(body.error_message, body.amount_ore);

    let existing: { id: string; payment_attempts: number | null } | null = null;

    if (setupId) {
      const { data, error } = await sb
        .from("order_reservations")
        .select("id, payment_attempts")
        .eq("setup_intent_id", setupId)
        .maybeSingle();
      if (error) {
        console.error("[log-payment-failure] lookup setup_intent_id:", error);
      } else if (data?.id) {
        existing = {
          id: String(data.id),
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
        .select("id, payment_attempts")
        .eq("payment_intent_id", paymentId)
        .maybeSingle();
      if (error) {
        console.error("[log-payment-failure] lookup payment_intent_id:", error);
      } else if (data?.id) {
        existing = {
          id: String(data.id),
          payment_attempts:
            typeof data.payment_attempts === "number"
              ? data.payment_attempts
              : data.payment_attempts != null
                ? Number(data.payment_attempts)
                : 0,
        };
      }
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

    const uid = body.user_id;
    const pid = body.pallet_id;
    if (uid && pid) {
      if (setupId) {
        const { error: insErr } = await sb.from("order_reservations").insert({
          user_id: uid,
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
          user_id: uid,
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
