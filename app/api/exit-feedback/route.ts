import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  EXIT_FEEDBACK_ANSWER_MAX,
  EXIT_FEEDBACK_PAGE_MAX,
  EXIT_FEEDBACK_REASONS,
  EXIT_FEEDBACK_SESSION_ID_MAX,
  normalizeExitFeedbackAnswer,
  sanitizeExitFeedbackPage,
} from "@/lib/analytics/exit-feedback";

/** Rate limit by anonymous session_id only — never by IP, never log IP. */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const rateBuckets = new Map<string, number[]>();

function allowSession(sessionId: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(sessionId) ?? [];
  const pruned = prev.filter((t) => now - t < WINDOW_MS);
  if (pruned.length >= MAX_PER_WINDOW) {
    rateBuckets.set(sessionId, pruned);
    return false;
  }
  pruned.push(now);
  rateBuckets.set(sessionId, pruned);
  return true;
}

const bodySchema = z.object({
  session_id: z
    .string()
    .trim()
    .min(8)
    .max(EXIT_FEEDBACK_SESSION_ID_MAX)
    .regex(/^[\w-]+$/),
  step: z.enum(["checkout", "cart"]),
  page: z.string().trim().min(1).max(EXIT_FEEDBACK_PAGE_MAX + 200),
  reason: z.enum(EXIT_FEEDBACK_REASONS),
  /** Optional free text; primarily for reason=other. Empty → null. */
  answer: z.string().max(EXIT_FEEDBACK_ANSWER_MAX).optional().nullable(),
  is_internal: z.boolean().optional(),
});

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { session_id, step, reason } = parsed.data;
  const page = sanitizeExitFeedbackPage(parsed.data.page);
  const is_internal = parsed.data.is_internal === true;

  // Reject oversize after trim via helper (schema max is raw length).
  if (
    typeof parsed.data.answer === "string" &&
    parsed.data.answer.trim().length > EXIT_FEEDBACK_ANSWER_MAX
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const answer = normalizeExitFeedbackAnswer(parsed.data.answer ?? null);

  if (!allowSession(session_id)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from("exit_feedback").insert({
      session_id,
      step,
      page,
      reason,
      answer,
      is_internal,
    });

    if (error) {
      console.error("[exit-feedback] insert failed");
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
  } catch {
    console.error("[exit-feedback] unexpected error");
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
