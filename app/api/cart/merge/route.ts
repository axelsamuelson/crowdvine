import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/supabase-server";
import { CartService } from "@/src/lib/cart-service";
import {
  bindCartOwnerAndTouch,
  reconcileSessionCartForUser,
} from "@/lib/cart/reconcile-on-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Strategy = "keep_session" | "keep_user" | "merge" | "auto";

function setCartCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  sessionId: string,
) {
  cookieStore.set("cv_cart_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

/**
 * GET — reconcile anonymous session cart with the authenticated user.
 * Always merges (sum quantities); no conflict modal for mid-checkout.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ conflict: false });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("cv_cart_id")?.value ?? null;

    const result = await reconcileSessionCartForUser({
      userId: user.id,
      sessionId,
    });

    if (result.sessionId && result.sessionId !== sessionId) {
      setCartCookie(cookieStore, result.sessionId);
    }

    return NextResponse.json({
      conflict: false,
      cartId: result.cartId,
      mergedFromCartIds: result.mergedFromCartIds,
    });
  } catch (e) {
    console.error("[cart/merge] GET error:", e);
    return NextResponse.json({ conflict: false });
  }
}

/**
 * POST — resolve with strategy keep_session | keep_user | merge | auto.
 * `auto` is the preferred mid-checkout path (same as GET reconcile).
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as {
      strategy?: Strategy;
    } | null;
    const strategy = body?.strategy ?? "auto";
    if (
      strategy !== "keep_session" &&
      strategy !== "keep_user" &&
      strategy !== "merge" &&
      strategy !== "auto"
    ) {
      return NextResponse.json({ error: "Invalid strategy" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("cv_cart_id")?.value ?? null;

    if (strategy === "auto" || strategy === "merge") {
      // Prefer keeping the session cart (mid-checkout) and folding owned carts into it.
      const result = await reconcileSessionCartForUser({
        userId: user.id,
        sessionId,
      });
      if (result.sessionId && result.sessionId !== sessionId) {
        setCartCookie(cookieStore, result.sessionId);
      }
      const cart = await CartService.getCart();
      return NextResponse.json({
        ok: true,
        cart,
        mergedFromCartIds: result.mergedFromCartIds,
      });
    }

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
      if (sessionCart) {
        await bindCartOwnerAndTouch(sessionCart.id, user.id);
      }
      const cart = await CartService.getCart();
      return NextResponse.json({ ok: true, conflict: false, cart });
    }

    const now = new Date().toISOString();

    if (strategy === "keep_session") {
      await sb.from("cart_items").delete().eq("cart_id", userCart.id);
      await sb.from("carts").delete().eq("id", userCart.id);
      await bindCartOwnerAndTouch(sessionCart.id, user.id);
    } else if (strategy === "keep_user") {
      await sb.from("cart_items").delete().eq("cart_id", sessionCart.id);
      await sb.from("carts").delete().eq("id", sessionCart.id);
      await sb
        .from("carts")
        .update({ updated_at: now })
        .eq("id", userCart.id);
      if (userCart.session_id) {
        setCartCookie(cookieStore, userCart.session_id);
      }
    }

    const cart = await CartService.getCart();
    return NextResponse.json({ ok: true, cart });
  } catch (e) {
    console.error("[cart/merge] POST error:", e);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
