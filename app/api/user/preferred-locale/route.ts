import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isAppLocale, LOCALE_COOKIE, type AppLocale } from "@/lib/i18n/locale";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveShoppingContext } from "@/lib/shopping-context/resolve";

/**
 * PATCH /api/user/preferred-locale — body `{ locale: "en" | "sv" }`.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const raw = body.locale ?? body.preferred_locale;
    if (typeof raw !== "string" || !isAppLocale(raw.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'locale must be "en" or "sv"' },
        { status: 400 },
      );
    }
    const locale = raw.trim().toLowerCase() as AppLocale;

    const shopping = await resolveShoppingContext({
      userId: user.id,
      host: request.headers.get("host"),
      cookieLocale: request.cookies.get(LOCALE_COOKIE)?.value ?? null,
      acceptLanguage: request.headers.get("accept-language"),
    });
    if (!shopping.availableLocales.includes(locale)) {
      return NextResponse.json(
        {
          error:
            "Swedish is not available for your current wine zone. Switch to a European zone or use English.",
        },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("profiles")
      .update({
        preferred_locale: locale,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      const missingColumn =
        error.message.includes("preferred_locale") ||
        error.code === "42703" ||
        error.code === "PGRST204";
      if (missingColumn) {
        const res = NextResponse.json({
          ok: true,
          locale,
          warning: "profiles.preferred_locale not migrated",
        });
        res.cookies.set(LOCALE_COOKIE, locale, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
        return res;
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, locale });
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
