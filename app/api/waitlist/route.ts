import { NextResponse } from "next/server";

import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import { sendEmail } from "@/lib/email";
import { countryLabel } from "@/lib/market/country-registry";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  evaluateWaitlistSignup,
  normalizeWaitlistEmail,
  normalizeWaitlistLines,
} from "@/lib/waitlist/signup";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    intent?: string;
    email?: string;
    countryCode?: string;
    dateOfBirth?: string;
    locale?: string;
    newsletterOptIn?: boolean;
    lines?: unknown;
  } | null;

  const countryCode = body?.countryCode ?? "";
  const lines = normalizeWaitlistLines(body?.lines);
  const locale = body?.locale === "en" ? "en" : "sv";
  const bottles = lines.reduce((sum, line) => sum + line.quantity, 0);
  const wineIds = lines.map((line) => line.wine_id);

  if (body?.intent === "shown") {
    await logUserEventServer({
      eventType: "waitlist_shown",
      eventCategory: "engagement",
      countryCode,
      metadata: { country: countryCode, wine_ids: wineIds, bottles },
    }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }

  const decision = evaluateWaitlistSignup({
    email: body?.email ?? "",
    countryCode,
    dateOfBirth: body?.dateOfBirth ?? "",
  });
  if (!decision.ok) {
    const message =
      decision.reason === "under_age"
        ? locale === "sv"
          ? "Du behöver ha fyllt åldersgränsen för att ställa dig på väntelistan."
          : "You need to meet the age limit to join the waitlist."
        : locale === "sv"
          ? "Kontrollera e-post och födelsedatum."
          : "Check the email and date of birth.";
    return NextResponse.json(
      { ok: false, reason: decision.reason, message },
      { status: decision.reason === "under_age" ? 200 : 400 },
    );
  }

  const email = normalizeWaitlistEmail(body?.email ?? "")!;
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("waitlist_signups").upsert(
    {
      email,
      country_code: decision.countryCode,
      locale,
      cart_snapshot: lines,
      newsletter_opt_in: body?.newsletterOptIn === true,
    },
    { onConflict: "email,country_code" },
  );
  if (error) {
    return NextResponse.json({ ok: false, message: "Could not save" }, { status: 500 });
  }

  await logUserEventServer({
    eventType: "waitlist_signup",
    eventCategory: "engagement",
    countryCode: decision.countryCode,
    metadata: {
      country: decision.countryCode,
      wine_ids: wineIds,
      bottles,
    },
  }).catch(() => undefined);

  const place = countryLabel(decision.countryCode, locale);
  const wineLines = lines
    .map((line) => `${line.quantity} × ${line.wine_id}`)
    .join("\n");
  const subject =
    locale === "sv"
      ? `Du står på väntelistan för ${place}`
      : `You're on the waitlist for ${place}`;
  const text =
    locale === "sv"
      ? `Vi levererar inte till ${place} än. Vi hör av oss när vi gör det.\n\n${wineLines}`
      : `We don't deliver to ${place} yet. We'll write when we do.\n\n${wineLines}`;
  try {
    await sendEmail({ to: email, subject, html: `<p>${text.replace(/\n/g, "<br/>")}</p>`, text });
  } catch (sendError) {
    console.warn("[waitlist] confirmation email:", sendError);
  }

  return NextResponse.json({ ok: true });
}
