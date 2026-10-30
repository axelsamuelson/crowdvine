import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/app-url";
import {
  NEWSLETTER_CONSENT_TEXT_VERSION,
  isExitDiscountEnabled,
} from "@/lib/exit-discount/config";
import { createExitDiscountCode } from "@/lib/exit-discount/codes";
import { sendExitDiscountEmail } from "@/lib/exit-discount/email";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const rateBuckets = new Map<string, number[]>();

function allowKey(key: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(key) ?? [];
  const pruned = prev.filter((t) => now - t < WINDOW_MS);
  if (pruned.length >= MAX_PER_WINDOW) {
    rateBuckets.set(key, pruned);
    return false;
  }
  pruned.push(now);
  rateBuckets.set(key, pruned);
  return true;
}

const bodySchema = z.object({
  email: z.string().trim().email().max(254),
  age_confirmed: z.literal(true),
  newsletter_opt_in: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!isExitDiscountEnabled()) {
    return NextResponse.json({ error: "Disabled" }, { status: 404 });
  }

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

  const email = parsed.data.email.trim().toLowerCase();
  const newsletterOptIn = parsed.data.newsletter_opt_in === true;

  if (!allowKey(email)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const ageConfirmedAt = new Date();
  const sb = getSupabaseAdmin();

  try {
    const created = await createExitDiscountCode({
      sb,
      email,
      ageConfirmedAt,
    });

    if (newsletterOptIn) {
      const { error: newsErr } = await sb.from("newsletter_consents").upsert(
        {
          email,
          consented_at: ageConfirmedAt.toISOString(),
          text_version: NEWSLETTER_CONSENT_TEXT_VERSION,
          source: "exit_popup",
          unsubscribed_at: null,
        },
        { onConflict: "email,source" },
      );
      if (newsErr) {
        console.error("[exit-discount] newsletter consent failed");
        // Discount still succeeds — newsletter must not block the code.
      }
    }

    try {
      await sendExitDiscountEmail({
        to: email,
        code: created.code,
        expiresAt: created.expiresAt,
        includeNewsletter: newsletterOptIn,
        origin: getAppUrl(),
      });
    } catch (err) {
      console.error("[exit-discount] email send failed");
      return NextResponse.json(
        { error: "Kunde inte skicka e-post" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      code: created.code,
      expires_at: created.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[exit-discount] create failed");
    return NextResponse.json({ error: "Failed to create code" }, { status: 500 });
  }
}
