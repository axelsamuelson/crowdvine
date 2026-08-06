import { getSupabaseAdmin } from "@/lib/supabase-admin";

type CartRow = {
  id: string;
  session_id: string | null;
  user_id: string | null;
};

type CartItemRow = {
  id: string;
  wine_id: string;
  quantity: number;
  source: string | null;
};

/**
 * Bind authenticated owner (when known) and bump updated_at.
 * Uses service role so ownership attach works even if the row was created
 * anonymously under session cookie auth.
 */
export async function bindCartOwnerAndTouch(
  cartId: string,
  userId: string | null | undefined,
): Promise<void> {
  if (!cartId) return;
  const sb = getSupabaseAdmin();
  const payload: { updated_at: string; user_id?: string } = {
    updated_at: new Date().toISOString(),
  };
  if (userId) payload.user_id = userId;
  const { error } = await sb.from("carts").update(payload).eq("id", cartId);
  if (error) {
    console.error("[cart] bindCartOwnerAndTouch:", error.message);
  }
}

/**
 * After login/signup: attach the current session cart to the user and merge
 * any other carts already owned by that user into it (sum quantities for the
 * same wine_id + source). Keeps the session cookie cart as the survivor so
 * mid-checkout identity does not change.
 */
export async function reconcileSessionCartForUser(opts: {
  userId: string;
  sessionId: string | null;
}): Promise<{
  cartId: string | null;
  sessionId: string | null;
  mergedFromCartIds: string[];
}> {
  const { userId } = opts;
  const sessionId = opts.sessionId?.trim() || null;
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const mergedFromCartIds: string[] = [];

  let sessionCart: CartRow | null = null;
  if (sessionId) {
    const { data } = await sb
      .from("carts")
      .select("id, session_id, user_id")
      .eq("session_id", sessionId)
      .maybeSingle();
    sessionCart = (data as CartRow | null) ?? null;
  }

  const { data: owned } = await sb
    .from("carts")
    .select("id, session_id, user_id")
    .eq("user_id", userId);

  const otherOwned = ((owned as CartRow[] | null) ?? []).filter(
    (c) => !sessionCart || c.id !== sessionCart.id,
  );

  // No session cart yet — keep the most recently touched owned cart (if any).
  if (!sessionCart) {
    if (otherOwned.length === 0) {
      return { cartId: null, sessionId, mergedFromCartIds };
    }
    const { data: ranked } = await sb
      .from("carts")
      .select("id, session_id, user_id, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const keep = ranked as (CartRow & { updated_at?: string }) | null;
    if (!keep) {
      return { cartId: null, sessionId, mergedFromCartIds };
    }
    await sb
      .from("carts")
      .update({ updated_at: now })
      .eq("id", keep.id);
    return {
      cartId: keep.id,
      sessionId: keep.session_id,
      mergedFromCartIds,
    };
  }

  // Attach owner to the session cart first.
  await sb
    .from("carts")
    .update({ user_id: userId, updated_at: now })
    .eq("id", sessionCart.id);

  for (const other of otherOwned) {
    const { data: items } = await sb
      .from("cart_items")
      .select("id, wine_id, quantity, source")
      .eq("cart_id", other.id);

    for (const item of (items as CartItemRow[] | null) ?? []) {
      let existingQuery = sb
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", sessionCart.id)
        .eq("wine_id", item.wine_id);

      if (item.source) {
        existingQuery = existingQuery.eq("source", item.source);
      } else {
        existingQuery = existingQuery.is("source", null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        await sb
          .from("cart_items")
          .update({
            quantity: Number(existing.quantity) + Number(item.quantity),
          })
          .eq("id", existing.id);
      } else {
        await sb.from("cart_items").insert({
          cart_id: sessionCart.id,
          wine_id: item.wine_id,
          quantity: item.quantity,
          ...(item.source ? { source: item.source } : {}),
        });
      }
    }

    await sb.from("cart_items").delete().eq("cart_id", other.id);
    await sb.from("carts").delete().eq("id", other.id);
    mergedFromCartIds.push(other.id);
  }

  await sb
    .from("carts")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", sessionCart.id);

  return {
    cartId: sessionCart.id,
    sessionId: sessionCart.session_id ?? sessionId,
    mergedFromCartIds,
  };
}
