import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const CART_COOKIE_NAME = "cv_cart_id";

export async function getOrSetCartId(): Promise<string> {
  const cookieStore = await cookies();
  let cartId = cookieStore.get(CART_COOKIE_NAME)?.value;

  if (!cartId) {
    cartId = randomUUID();
    cookieStore.set(CART_COOKIE_NAME, cartId, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 days
      secure: process.env.NODE_ENV === "production",
    });
  }

  return cartId;
}

export async function getCartId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE_NAME)?.value || null;
}

export async function clearCartId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE_NAME);
}
