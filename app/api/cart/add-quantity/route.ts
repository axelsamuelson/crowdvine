import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";

/**
 * POST /api/cart/add-quantity
 *
 * Add multiple items of the same variant to cart in a single operation.
 * This is more efficient than calling add multiple times.
 */
export async function POST(request: Request) {
  try {
    console.log("🛒 [ADD-QUANTITY] API called");

    const body = await request.json();
    const { variantId, quantity: requestedQuantity = 1, source = "producer" } = body;

    console.log("🛒 [ADD-QUANTITY] Variant ID:", variantId);
    console.log("🛒 [ADD-QUANTITY] Requested quantity:", requestedQuantity);

    if (!variantId) {
      return NextResponse.json(
        { error: "No variantId provided" },
        { status: 400 },
      );
    }

    // Validate and sanitize quantity
    const quantity = Math.max(
      1,
      Math.min(99, parseInt(String(requestedQuantity)) || 1),
    );
    console.log("🛒 [ADD-QUANTITY] Validated quantity:", quantity);

    // Extract base ID from variant ID (remove -default suffix)
    const baseId = variantId.replace("-default", "");
    console.log("🛒 [ADD-QUANTITY] Base ID:", baseId);

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
      console.log("🛒 [ADD-QUANTITY] Created new cart ID:", cartId);
    }

    // Ensure cart exists in database
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
        console.error("🛒 [ADD-QUANTITY] Error creating cart:", createError);
        return NextResponse.json(
          { error: "Failed to create cart" },
          { status: 500 },
        );
      }

      dbCartId = newCart.id;
      console.log("🛒 [ADD-QUANTITY] Created new cart:", dbCartId);
    } else {
      dbCartId = existingCart.id;
      console.log("🛒 [ADD-QUANTITY] Using existing cart:", dbCartId);
    }

    // Check if item already exists in cart with same source
    // First try with source column (new schema)
    let existingItem = null;
    let hasSourceColumn = true;
    
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, source")
        .eq("cart_id", dbCartId)
        .eq("wine_id", baseId)
        .eq("source", source)
        .maybeSingle();
      
      if (error && error.code === "42703") {
        // Column "source" does not exist - fallback to old schema
        hasSourceColumn = false;
        console.log("🛒 [ADD-QUANTITY] Source column not found, using old schema");
      } else if (data) {
        existingItem = data;
      }
    } catch (err) {
      // If source column doesn't exist, fallback to old schema
      hasSourceColumn = false;
      console.log("🛒 [ADD-QUANTITY] Source column not found, using old schema");
    }

    // If source column doesn't exist, check without source
    if (!hasSourceColumn && !existingItem) {
      const { data: oldItem } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", dbCartId)
        .eq("wine_id", baseId)
        .maybeSingle();
      
      if (oldItem) {
        existingItem = oldItem;
      }
    }

    if (existingItem) {
      // Item exists - increment quantity by requested amount
      const newQuantity = existingItem.quantity + quantity;
      console.log(
        "🛒 [ADD-QUANTITY] Item exists, incrementing from",
        existingItem.quantity,
        "to",
        newQuantity,
      );

      const { error: updateError } = await supabase
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", existingItem.id);

      if (updateError) {
        console.error(
          "🛒 [ADD-QUANTITY] Error updating quantity:",
          updateError,
        );
        return NextResponse.json(
          { error: "Failed to update quantity", details: updateError.message },
          { status: 500 },
        );
      }
    } else {
      // Item doesn't exist - insert with requested quantity
      console.log(
        "🛒 [ADD-QUANTITY] Item not in cart, inserting with quantity",
        quantity,
        "and source",
        source,
      );

      const insertData: any = {
        cart_id: dbCartId,
        wine_id: baseId,
        quantity: quantity,
      };

      // Only include source if column exists
      if (hasSourceColumn) {
        insertData.source = source;
      }

      const { error: insertError } = await supabase
        .from("cart_items")
        .insert(insertData);

      if (insertError) {
        console.error("🛒 [ADD-QUANTITY] Error inserting item:", insertError);
        return NextResponse.json(
          { error: "Failed to add item", details: insertError.message },
          { status: 500 },
        );
      }
    }

    console.log("🛒 [ADD-QUANTITY] Successfully added/updated item");

    // Get updated cart with all items
    const { data: cartItems, error: fetchError } = await supabase
      .from("cart_items")
      .select(
        `
        id,
        quantity,
        source,
        wines (
          id,
          handle,
          wine_name,
          vintage,
          label_image_path,
          base_price_cents,
          color
        )
      `,
      )
      .eq("cart_id", dbCartId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("🛒 [ADD-QUANTITY] Error fetching cart:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch cart" },
        { status: 500 },
      );
    }

    // Build cart response
    const lines = (cartItems || []).map((item) => {
      const selectedOptions = item.wines.color
        ? [{ name: "Color", value: item.wines.color }]
        : [];

      return {
        id: item.id,
        quantity: item.quantity,
        source: item.source || "producer", // Default to producer for backwards compatibility
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
            featuredImage: {
              url: item.wines.label_image_path || DEFAULT_WINE_IMAGE_PATH,
              altText: `${item.wines.wine_name} ${item.wines.vintage}`,
            },
            priceRange: {
              minVariantPrice: {
                amount: (item.wines.base_price_cents / 100).toString(),
                currencyCode: "SEK",
              },
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

    console.log("🛒 [ADD-QUANTITY] Cart built:", {
      items: cart.lines.length,
      totalQuantity: cart.totalQuantity,
      total: cart.cost.totalAmount.amount,
    });

    return NextResponse.json({
      success: true,
      cart: cart,
    });
  } catch (error) {
    console.error("🛒 [ADD-QUANTITY] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
