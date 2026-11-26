import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CART_COOKIE_NAME = "cv_cart_id";

/**
 * Cookie value that should be stored so the next request's `cv_cart_id`
 * equals `carts.id` (the id add-quantity / getCart actually use).
 */
export function alignedCartCookie(
  current: string | null | undefined,
  cartDbId: string,
): string {
  const id = cartDbId.trim();
  if (id) return id;
  return (current ?? "").trim();
}

/**
 * Point `cv_cart_id` and `carts.session_id` at the same row id.
 * The historical cookie stored `session_id` while logs printed `carts.id`,
 * so a logged-in cart looked like a different basket after merge.
 */
export async function alignCartCookieToDbId(cartDbId: string): Promise<string> {
  const id = cartDbId.trim();
  if (!id) return id;

  try {
    const sb = getSupabaseAdmin();
    const { data: row, error } = await sb
      .from("carts")
      .select("id, session_id")
      .eq("id", id)
      .maybeSingle();
    if (error || !row) return id;

    let sessionId =
      typeof row.session_id === "string" && row.session_id.trim()
        ? row.session_id.trim()
        : id;

    const previousSessionId = sessionId;
    if (sessionId !== id) {
      const { data: clash } = await sb
        .from("carts")
        .select("id")
        .eq("session_id", id)
        .neq("id", id)
        .maybeSingle();
      if (!clash) {
        const { error: updateError } = await sb
          .from("carts")
          .update({ session_id: id })
          .eq("id", id);
        if (!updateError) sessionId = id;
      }
    }

    const cookieStore = await cookies();
    const current = cookieStore.get(CART_COOKIE_NAME)?.value ?? null;
    const next = alignedCartCookie(current, sessionId);
    if (current !== next) {
      try {
        cookieStore.set(CART_COOKIE_NAME, next, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 90,
        });
      } catch (cookieError) {
        if (sessionId !== previousSessionId) {
          await sb
            .from("carts")
            .update({ session_id: previousSessionId })
            .eq("id", id);
        }
        console.warn(
          "[cart] align cookie:",
          cookieError instanceof Error ? cookieError.message : cookieError,
        );
        return previousSessionId;
      }
    }
    return next;
  } catch (error) {
    console.warn(
      "[cart] align cookie:",
      error instanceof Error ? error.message : error,
    );
    return id;
  }
}
