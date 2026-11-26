import { cookies } from "next/headers";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CART_COOKIE_NAME = "cv_cart_id";

const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 90,
};

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
 *
 * Call from route handlers (add-quantity, cart APIs, after auth reconcile).
 * Skips when the cookie already equals the row id, so a session only writes once.
 * If `cookies().set` throws (RSC render), returns without touching the row.
 */
export async function alignCartCookieToDbId(cartDbId: string): Promise<string> {
  const id = cartDbId.trim();
  if (!id) return id;

  let cookieStore: Awaited<ReturnType<typeof cookies>>;
  try {
    cookieStore = await cookies();
  } catch {
    return id;
  }

  const current = cookieStore.get(CART_COOKIE_NAME)?.value?.trim() ?? "";
  if (current === id) return id;

  try {
    // Re-set the current value first. Route handlers accept this. RSC render
    // throws before the cookie changes, so we never update session_id there.
    cookieStore.set(CART_COOKIE_NAME, current || id, CART_COOKIE_OPTIONS);
  } catch (cookieError) {
    console.warn(
      "[cart] align cookie skipped:",
      cookieError instanceof Error ? cookieError.message : cookieError,
    );
    return current || id;
  }

  try {
    const sb = getSupabaseAdmin();
    const { data: row, error } = await sb
      .from("carts")
      .select("id, session_id")
      .eq("id", id)
      .maybeSingle();
    if (error || !row) {
      if (!current) {
        cookieStore.set(CART_COOKIE_NAME, "", { ...CART_COOKIE_OPTIONS, maxAge: 0 });
      }
      return current || id;
    }

    const sessionId =
      typeof row.session_id === "string" && row.session_id.trim()
        ? row.session_id.trim()
        : "";
    if (sessionId === id) {
      if (current !== id) {
        cookieStore.set(CART_COOKIE_NAME, id, CART_COOKIE_OPTIONS);
      }
      return id;
    }

    const { data: clash } = await sb
      .from("carts")
      .select("id")
      .eq("session_id", id)
      .neq("id", id)
      .maybeSingle();
    if (clash) {
      if (current && current !== id) {
        cookieStore.set(CART_COOKIE_NAME, current, CART_COOKIE_OPTIONS);
      }
      return current || sessionId || id;
    }

    const { error: updateError } = await sb
      .from("carts")
      .update({ session_id: id })
      .eq("id", id);
    if (updateError) {
      if (current) {
        cookieStore.set(CART_COOKIE_NAME, current, CART_COOKIE_OPTIONS);
      }
      console.warn("[cart] align cookie:", updateError.message);
      return current || sessionId || id;
    }

    cookieStore.set(CART_COOKIE_NAME, id, CART_COOKIE_OPTIONS);
    return id;
  } catch (error) {
    console.warn(
      "[cart] align cookie:",
      error instanceof Error ? error.message : error,
    );
    return current || id;
  }
}
