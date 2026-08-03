import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";
import { CartService } from "@/src/lib/cart-service";

type Strategy = "keep_session" | "keep_user" | "merge";

/**
 * GET — detect anonymous session cart vs authenticated user cart conflict.
 * POST — resolve conflict with strategy keep_session | keep_user | merge.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ conflict: false });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("cv_cart_id")?.value ?? null;
    if (!sessionId) {
      return NextResponse.json({ conflict: false });
    }

    const sb = getSupabaseAdmin();

    const { data: sessionCart } = await sb
      .from("carts")
      .select("id, session_id, user_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    const { data: userCarts } = await sb
      .from("carts")
      .select("id, session_id, user_id")
      .eq("user_id", user.id)
      .neq("session_id", sessionId);

    const otherUserCart = (userCarts ?? [])[0] ?? null;

    if (!sessionCart || !otherUserCart) {
      // Attach user_id to session cart if needed
      if (sessionCart && !sessionCart.user_id) {
        await sb
          .from("carts")
          .update({
            user_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionCart.id);
      }
      return NextResponse.json({ conflict: false });
    }

    const [{ count: sessionCount }, { count: userCount }] = await Promise.all([
      sb
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("cart_id", sessionCart.id),
      sb
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("cart_id", otherUserCart.id),
    ]);

    if ((sessionCount ?? 0) === 0 || (userCount ?? 0) === 0) {
      if ((userCount ?? 0) === 0) {
        await sb
          .from("carts")
          .update({
            user_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sessionCart.id);
        await sb.from("carts").delete().eq("id", otherUserCart.id);
      } else if ((sessionCount ?? 0) === 0) {
        cookieStore.set("cv_cart_id", otherUserCart.session_id ?? sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        });
        await sb.from("carts").delete().eq("id", sessionCart.id);
      }
      return NextResponse.json({ conflict: false });
    }

    return NextResponse.json({
      conflict: true,
      sessionCartId: sessionCart.id,
      userCartId: otherUserCart.id,
      sessionItemCount: sessionCount,
      userItemCount: userCount,
    });
  } catch (e) {
    console.error("[cart/merge] GET error:", e);
    return NextResponse.json({ conflict: false });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      strategy?: Strategy;
    } | null;
    const strategy = body?.strategy;
    if (
      strategy !== "keep_session" &&
      strategy !== "keep_user" &&
      strategy !== "merge"
    ) {
      return NextResponse.json({ error: "Invalid strategy" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("cv_cart_id")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "No session cart" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: sessionCart } = await sb
      .from("carts")
      .select("id, session_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    const { data: userCarts } = await sb
      .from("carts")
      .select("id, session_id")
      .eq("user_id", user.id)
      .neq("session_id", sessionId);

    const userCart = (userCarts ?? [])[0] ?? null;
    if (!sessionCart || !userCart) {
      return NextResponse.json({ ok: true, conflict: false });
    }

    const now = new Date().toISOString();

    if (strategy === "keep_session") {
      await sb.from("cart_items").delete().eq("cart_id", userCart.id);
      await sb.from("carts").delete().eq("id", userCart.id);
      await sb
        .from("carts")
        .update({ user_id: user.id, updated_at: now })
        .eq("id", sessionCart.id);
    } else if (strategy === "keep_user") {
      await sb.from("cart_items").delete().eq("cart_id", sessionCart.id);
      await sb.from("carts").delete().eq("id", sessionCart.id);
      await sb
        .from("carts")
        .update({ updated_at: now })
        .eq("id", userCart.id);
      if (userCart.session_id) {
        cookieStore.set("cv_cart_id", userCart.session_id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        });
      }
    } else {
      // merge: sum quantities for same wine into user cart, then switch cookie
      const { data: sessionItems } = await sb
        .from("cart_items")
        .select("id, wine_id, quantity, source")
        .eq("cart_id", sessionCart.id);

      for (const item of sessionItems ?? []) {
        const { data: existing } = await sb
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", userCart.id)
          .eq("wine_id", item.wine_id)
          .maybeSingle();

        if (existing) {
          await sb
            .from("cart_items")
            .update({ quantity: existing.quantity + item.quantity })
            .eq("id", existing.id);
        } else {
          await sb.from("cart_items").insert({
            cart_id: userCart.id,
            wine_id: item.wine_id,
            quantity: item.quantity,
            ...(item.source ? { source: item.source } : {}),
          });
        }
      }

      await sb.from("cart_items").delete().eq("cart_id", sessionCart.id);
      await sb.from("carts").delete().eq("id", sessionCart.id);
      await sb
        .from("carts")
        .update({ user_id: user.id, updated_at: now })
        .eq("id", userCart.id);

      if (userCart.session_id) {
        cookieStore.set("cv_cart_id", userCart.session_id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        });
      }
    }

    const cart = await CartService.getCart();
    return NextResponse.json({ ok: true, cart });
  } catch (e) {
    console.error("[cart/merge] POST error:", e);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
