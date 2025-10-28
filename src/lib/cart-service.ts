import { supabaseServer } from "../../lib/supabase-server";
import { getOrSetCartId, clearCartId } from "./cookies";
import type { Cart, CartItem } from "../../lib/shopify/types";

export class CartService {
  private static async ensureCart() {
    console.log("🔧 ensureCart called");
    const cartId = await getOrSetCartId();
    console.log("🔧 Cart ID from cookies:", cartId);

    const sb = await supabaseServer();
    console.log("🔧 Supabase client obtained in ensureCart");

    // Check if cart exists, create if not
    console.log("🔧 Checking if cart exists...");
    const { data: existingCart, error: checkError } = await sb
      .from("carts")
      .select("id")
      .eq("session_id", cartId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("🔧 Error checking for existing cart:", checkError);
    }

    if (!existingCart) {
      console.log("🔧 No existing cart, creating new one...");
      const { data: newCart, error } = await sb
        .from("carts")
        .insert({ session_id: cartId })
        .select("id")
        .single();

      if (error) {
        console.error("🔧 Error creating cart:", error);
        throw new Error("Failed to create cart");
      }

      console.log("🔧 New cart created with ID:", newCart.id);
      return newCart.id;
    }

    console.log("🔧 Existing cart found with ID:", existingCart.id);
    return existingCart.id;
  }

  static async getCart(): Promise<Cart | null> {
    console.log("🔧 getCart called");
    try {
      const cartId = await getOrSetCartId();
      console.log("🔧 Cart ID from cookies:", cartId);

      const sb = await supabaseServer();
      console.log("🔧 Supabase client obtained in getCart");

      const ensureCartId = await this.ensureCart();
      console.log("🔧 Ensure cart ID:", ensureCartId);

      console.log("🔧 Fetching cart items...");
      const { data: cartItems, error } = await sb
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
        .eq("cart_id", ensureCartId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("🔧 Failed to get cart items:", error);
        return null;
      }

      console.log("🔧 Cart items fetched:", cartItems?.length || 0, "items");

      if (!cartItems || cartItems.length === 0) {
        console.log("🔧 No cart items, returning empty cart");
        const emptyCart = {
          id: ensureCartId, // Use the actual database cart ID
          checkoutUrl: "/checkout",
          cost: {
            subtotalAmount: { amount: "0.00", currencyCode: "SEK" },
            totalAmount: { amount: "0.00", currencyCode: "SEK" },
            totalTaxAmount: { amount: "0", currencyCode: "SEK" },
          },
          totalQuantity: 0,
          lines: [],
        };
        return emptyCart;
      }

      const lines: CartItem[] = cartItems.map((item) => {
        // Build selectedOptions from wine color
        const selectedOptions = item.wines.color
          ? [{ name: "Color", value: item.wines.color }]
          : [];

        return {
          id: item.id,
          quantity: item.quantity,
          cost: {
            totalAmount: {
              amount: (
                (item.wines.base_price_cents * item.quantity) /
                100
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
              producerName: (item.wines as any).producers?.name || undefined,
              description: "",
              descriptionHtml: "",
              productType: "wine",
              categoryId: "",
              options: [],
              variants: [
                {
                  id: `${item.wines.id}-default`,
                  title: "750 ml",
                  availableForSale: true,
                  price: {
                    amount: Math.round(
                      item.wines.base_price_cents / 100,
                    ).toString(),
                    currencyCode: "SEK",
                  },
                  selectedOptions,
                },
              ],
              priceRange: {
                minVariantPrice: {
                  amount: Math.round(
                    item.wines.base_price_cents / 100,
                  ).toString(),
                  currencyCode: "SEK",
                },
                maxVariantPrice: {
                  amount: Math.round(
                    item.wines.base_price_cents / 100,
                  ).toString(),
                  currencyCode: "SEK",
                },
              },
              featuredImage: {
                id: `${item.wines.id}-img`,
                url: item.wines.label_image_path,
                altText: item.wines.wine_name,
                width: 600,
                height: 600,
              },
              images: [
                {
                  id: `${item.wines.id}-img`,
                  url: item.wines.label_image_path,
                  altText: item.wines.wine_name,
                  width: 600,
                  height: 600,
                },
              ],
              seo: { title: item.wines.wine_name, description: "" },
              tags: [],
              availableForSale: true,
              currencyCode: "SEK",
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
          },
        };
      });

      const subtotal = lines.reduce(
        (sum, line) => sum + parseFloat(line.cost.totalAmount.amount),
        0,
      );

      const result = {
        id: await this.ensureCart(), // Use the actual database cart ID
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

      return result;
    } catch (error) {
      console.error("=== CART SERVICE GET CART ERROR ===");
      console.error("CartService.getCart error:", error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      console.error("=== CART SERVICE GET CART ERROR END ===");
      return null;
    }
  }

  static async addItem(
    wineId: string,
    quantity: number = 1,
  ): Promise<Cart | null> {
    console.log(
      "🔧 CartService.addItem called with wineId:",
      wineId,
      "quantity:",
      quantity,
    );

    try {
      console.log("🔧 Calling ensureCart...");
      const cartId = await this.ensureCart();
      console.log("🔧 Cart ID:", cartId);

      console.log("🔧 Getting supabase server client...");
      const sb = await supabaseServer();
      console.log("🔧 Supabase client obtained");

      // Use upsert to either insert or update in a single operation
      console.log("🔧 Attempting upsert...");
      const { error: upsertError } = await sb.from("cart_items").upsert(
        {
          cart_id: cartId,
          wine_id: wineId,
          quantity: sb.raw(`COALESCE(quantity, 0) + ${quantity}`),
        },
        {
          onConflict: "cart_id,wine_id",
          ignoreDuplicates: false,
        },
      );

      if (upsertError) {
        console.log("🔧 Upsert failed, trying fallback method:", upsertError);
        // Fallback to manual check and update if upsert fails
        const { data: existingItem } = await sb
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", cartId)
          .eq("wine_id", wineId)
          .single();

        if (existingItem) {
          console.log("🔧 Found existing item, updating quantity");
          const { error: updateError } = await sb
            .from("cart_items")
            .update({ quantity: existingItem.quantity + quantity })
            .eq("id", existingItem.id);

          if (updateError) {
            console.error("🔧 Update error:", updateError);
            throw new Error("Failed to update cart item");
          }
        } else {
          console.log("🔧 No existing item, inserting new");
          const { error: insertError } = await sb.from("cart_items").insert({
            cart_id: cartId,
            wine_id: wineId,
            quantity,
          });

          if (insertError) {
            console.error("🔧 Insert error:", insertError);
            throw new Error("Failed to add cart item");
          }
        }
      } else {
        console.log("🔧 Upsert successful");
      }

      // Return updated cart
      console.log("🔧 Getting updated cart...");
      const cart = await this.getCart();
      console.log(
        "🔧 CartService.addItem returning cart with",
        cart?.lines.length || 0,
        "items",
      );
      return cart;
    } catch (error) {
      console.error("🔧 CartService.addItem error:", error);
      console.error(
        "🔧 Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      return null;
    }
  }

  static async updateItem(
    itemId: string,
    quantity: number,
  ): Promise<Cart | null> {
    try {
      const sb = await supabaseServer();

      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        const { error } = await sb.from("cart_items").delete().eq("id", itemId);

        if (error) {
          console.error("Failed to remove cart item:", error);
          throw new Error("Failed to remove cart item");
        }
      } else {
        // Update quantity
        const { error } = await sb
          .from("cart_items")
          .update({ quantity })
          .eq("id", itemId);

        if (error) {
          console.error("Failed to update cart item:", error);
          throw new Error("Failed to update cart item");
        }
      }

      return await this.getCart();
    } catch (error) {
      console.error("CartService.updateItem error:", error);
      return null;
    }
  }

  static async removeItem(itemId: string): Promise<Cart | null> {
    try {
      const sb = await supabaseServer();

      const { error } = await sb.from("cart_items").delete().eq("id", itemId);

      if (error) {
        console.error("Failed to remove cart item:", error);
        throw new Error("Failed to remove cart item");
      }

      return await this.getCart();
    } catch (error) {
      console.error("CartService.removeItem error:", error);
      return null;
    }
  }

  static async clearCart(): Promise<void> {
    try {
      const cartId = await getOrSetCartId();
      const sb = await supabaseServer();

      const { error } = await sb
        .from("cart_items")
        .delete()
        .eq("cart_id", await this.ensureCart());

      if (error) {
        console.error("Failed to clear cart:", error);
        throw new Error("Failed to clear cart");
      }
    } catch (error) {
      console.error("CartService.clearCart error:", error);
      throw error;
    }
  }
}
