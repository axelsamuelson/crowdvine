import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyNewsletterUnsubscribeToken } from "@/lib/newsletter/tokens";

/**
 * Signed-token newsletter unsubscribe.
 * Ready for when the newsletter product ships; marks unsubscribed_at.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return new NextResponse("Ogiltig länk.", { status: 400 });
  }

  const verified = verifyNewsletterUnsubscribeToken(token);
  if (!verified.ok) {
    return new NextResponse("Ogiltig eller utgången länk.", { status: 400 });
  }

  try {
    const sb = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await sb
      .from("newsletter_consents")
      .update({ unsubscribed_at: now })
      .eq("email", verified.email)
      .is("unsubscribed_at", null);

    if (error) {
      console.error("[newsletter/unsubscribe] update failed");
      return new NextResponse("Kunde inte avregistrera. Försök igen senare.", {
        status: 500,
      });
    }
  } catch {
    console.error("[newsletter/unsubscribe] unexpected error");
    return new NextResponse("Kunde inte avregistrera. Försök igen senare.", {
      status: 500,
    });
  }

  const html = `<!doctype html>
<html lang="sv"><head><meta charset="utf-8"/><title>Avregistrerad</title></head>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;">
  <h1 style="font-size:1.25rem;">Du är avregistrerad</h1>
  <p>Du får inte längre nyhetsbrev från PACT på den här adressen.</p>
  <p><a href="https://pactwines.com">Tillbaka till PACT</a></p>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
