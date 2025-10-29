import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    console.log("🔧 Simple add API called");

    const body = await request.json();
    const { variantId } = body;

    console.log("🔧 Variant ID:", variantId);

    if (!variantId) {
      return NextResponse.json(
        { error: "No variantId provided" },
        { status: 400 },
      );
    }

    // Extract base ID from variant ID (remove -default suffix)
    const baseId = variantId.replace("-default", "");
    console.log("🔧 Base ID:", baseId);

    // Create Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      },
    );

    console.log("🔧 Supabase client created");

    // Get or create cart ID
    let cartId = cookieStore.get("cv_cart_id")?.value;
    if (!cartId) {
      cartId = crypto.randomUUID();
      cookieStore.set("cv_cart_id", cartId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
    console.log("🔧 Cart ID:", cartId);

    // Ensure cart exists
    const { data: existingCart } = await supabase
      .from("carts")
      .select("id")
      .eq("session_id", cartId)
      .single();

    let dbCartId;
    if (!existingCart) {
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ session_id: cartId })
        .select("id")
        .single();

      if (createError) {
        console.error("🔧 Error creating cart:", createError);
        return NextResponse.json(
          { error: "Failed to create cart" },
          { status: 500 },
        );
      }

      dbCartId = newCart.id;
      console.log("🔧 New cart created:", dbCartId);
    } else {
      dbCartId = existingCart.id;
      console.log("🔧 Existing cart found:", dbCartId);
    }

    // Check if item already exists
    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", dbCartId)
      .eq("wine_id", baseId)
      .maybeSingle();

    if (existingItem) {
      // Increment existing quantity
      console.log(
        "🔧 Item exists, incrementing from",
        existingItem.quantity,
        "to",
        existingItem.quantity + 1,
      );
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({ quantity: existingItem.quantity + 1 })
        .eq("id", existingItem.id);

      if (updateError) {
        console.error("🔧 Error updating item:", updateError);
        return NextResponse.json(
          { error: "Failed to update item" },
          { status: 500 },
        );
      }
    } else {
      // Insert new item
      console.log("🔧 New item, inserting with quantity 1");
      const { error: insertError } = await supabase.from("cart_items").insert({
        cart_id: dbCartId,
        wine_id: baseId,
        quantity: 1,
      });

      if (insertError) {
        console.error("🔧 Error inserting item:", insertError);
        return NextResponse.json(
          { error: "Failed to add item" },
          { status: 500 },
        );
      }
    }

    console.log("🔧 Item added/updated successfully");

    // Get updated cart with wine details in a single query
    const { data: cartItems, error: fetchError } = await supabase
      .from("cart_items")
      .select(
        `
        id,
        quantity,
        wines (
          id,
          handle,
          wine_name,
          vintage,
          label_image_path,
          base_price_cents,
          color,
          producer_id,
          producers (
            name
          )
        )
      `,
      )
      .eq("cart_id", dbCartId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("🔧 Error fetching cart items:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch cart" },
        { status: 500 },
      );
    }

    console.log("🔧 Cart items fetched:", cartItems?.length || 0);

    // Build cart response
    const lines = (cartItems || []).map((item) => {
      const selectedOptions = item.wines.color
        ? [{ name: "Color", value: item.wines.color }]
        : [];
      
      // Get producer name - producers can be array or object
      const producerName = Array.isArray(item.wines.producers)
        ? item.wines.producers[0]?.name
        : item.wines.producers?.name;

      return {
        id: item.id,
        quantity: item.quantity,
        cost: {
          totalAmount: {
            amount: Math.round(
              (item.wines.base_price_cents * item.quantity) / 100,
            ).toString(),
            currencyCode: "SEK",
          },
        },
        merchandise: {
          id: item.wines.id,
          title: `${item.wines.wine_name} ${item.wines.vintage}`,
          selectedOptions,
          product: {
            id: item.wines.id,
            title: `${item.wines.wine_name} ${item.wines.vintage}`,
            handle: item.wines.handle,
            producerName: producerName,
            featuredImage: {
              url: item.wines.label_image_path || "/placeholder-wine.jpg",
              altText: `${item.wines.wine_name} ${item.wines.vintage}`,
            },
          },
        },
      };
    });

    const subtotal = lines.reduce(
      (sum, line) => sum + parseFloat(line.cost.totalAmount.amount),
      0,
    );

    const cart = {
      id: dbCartId,
      checkoutUrl: "/checkout",
      cost: {
        subtotalAmount: {
          amount: Math.round(subtotal).toString(),
          currencyCode: "SEK",
        },
        totalAmount: {
          amount: Math.round(subtotal).toString(),
          currencyCode: "SEK",
        },
        totalTaxAmount: { amount: "0", currencyCode: "SEK" },
      },
      totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      lines,
    };

    console.log(
      "🔧 Cart built with",
      cart.lines.length,
      "items, total quantity:",
      cart.totalQuantity,
    );

    return NextResponse.json({
      success: true,
      cart: cart,
    });
  } catch (error) {
    console.error("🔧 Simple add API error:", error);
    console.error(
      "🔧 Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
