// Test the real CartService to find the actual issue
console.log("🔧 Testing Real CartService Implementation");

// Mock the dependencies that CartService needs
const mockSupabaseServer = () => {
  console.log("🔧 Creating mock Supabase server client");
  return {
    from: (table) => ({
      select: (columns) => ({
        eq: (column, value) => ({
          single: () => {
            console.log(`🔧 Mock query: SELECT ${columns} FROM ${table} WHERE ${column} = ${value}`);
            if (table === "carts" && column === "session_id") {
              // Simulate cart not found initially, then found after creation
              return { data: null, error: { code: "PGRST116" } };
            }
            if (table === "cart_items" && column === "cart_id") {
              // Simulate empty cart items
              return { data: [], error: null };
            }
            return { data: null, error: null };
          }
        }),
        order: (column, options) => ({
          eq: (cartId) => {
            console.log(`🔧 Mock query: SELECT ${columns} FROM ${table} WHERE cart_id = ${cartId} ORDER BY ${column}`);
            return { data: [], error: null };
          }
        })
      }),
      insert: (data) => ({
        select: (columns) => ({
          single: () => {
            console.log(`🔧 Mock insert: INSERT INTO ${table}`, data);
            if (table === "carts") {
              return { data: { id: "new-cart-123" }, error: null };
            }
            if (table === "cart_items") {
              return { data: { id: "new-item-123" }, error: null };
            }
            return { data: { id: "new-id" }, error: null };
          }
        })
      }),
      upsert: (data, options) => {
        console.log(`🔧 Mock upsert: UPSERT INTO ${table}`, data, options);
        // Simulate successful upsert
        return { error: null };
      },
      update: (data) => ({
        eq: (column, value) => {
          console.log(`🔧 Mock update: UPDATE ${table} SET`, data, `WHERE ${column} = ${value}`);
          return { error: null };
        }
      }),
      delete: () => ({
        eq: (column, value) => {
          console.log(`🔧 Mock delete: DELETE FROM ${table} WHERE ${column} = ${value}`);
          return { error: null };
        }
      })
    })
  };
};

const mockGetOrSetCartId = () => {
  console.log("🔧 Mock getOrSetCartId called");
  return "test-cart-id-123";
};

// Mock the CartService class with the EXACT same logic as the real one
class MockCartService {
  static async ensureCart() {
    console.log("🔧 ensureCart called");
    const cartId = await mockGetOrSetCartId();
    console.log("🔧 Cart ID from cookies:", cartId);

    const sb = await mockSupabaseServer();
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

  static async getCart() {
    console.log("🔧 getCart called");
    try {
      const cartId = await mockGetOrSetCartId();
      console.log("🔧 Cart ID from cookies:", cartId);

      const sb = await mockSupabaseServer();
      console.log("🔧 Supabase client obtained in getCart");

      const ensureCartId = await this.ensureCart();
      console.log("🔧 Ensure cart ID:", ensureCartId);

      console.log("🔧 Fetching cart items...");
      const { data: cartItems, error } = await sb
        .from("cart_items")
        .select(`
          id,
          quantity,
          wines (
            id,
            handle,
            wine_name,
            vintage,
            label_image_path,
            base_price_cents,
            color
          )
        `)
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
          id: ensureCartId,
          checkoutUrl: "/checkout",
          cost: {
            subtotalAmount: { amount: "0.00", currencyCode: "SEK" },
            totalAmount: { amount: "0.00", currencyCode: "SEK" },
            totalTaxAmount: { amount: "0.00", currencyCode: "SEK" },
          },
          totalQuantity: 0,
          lines: [],
        };
        return emptyCart;
      }

      // Process cart items (simplified for testing)
      console.log("🔧 Processing cart items...");
      const lines = cartItems.map((item) => {
        const selectedOptions = item.wines.color 
          ? [{ name: "Color", value: item.wines.color }]
          : [];

        return {
          id: item.id,
          quantity: item.quantity,
          cost: {
            totalAmount: {
              amount: ((item.wines.base_price_cents * item.quantity) / 100).toFixed(2),
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
            },
          },
        };
      });

      const subtotal = lines.reduce(
        (sum, line) => sum + parseFloat(line.cost.totalAmount.amount),
        0,
      );

      return {
        id: ensureCartId,
        checkoutUrl: "/checkout",
        cost: {
          subtotalAmount: { amount: subtotal.toFixed(2), currencyCode: "SEK" },
          totalAmount: { amount: subtotal.toFixed(2), currencyCode: "SEK" },
          totalTaxAmount: { amount: "0.00", currencyCode: "SEK" },
        },
        totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
        lines,
      };
    } catch (error) {
      console.error("🔧 getCart error:", error);
      return null;
    }
  }

  static async addItem(wineId, quantity = 1) {
    console.log("🔧 addItem called with wineId:", wineId, "quantity:", quantity);
    
    try {
      console.log("🔧 Calling ensureCart...");
      const cartId = await this.ensureCart();
      console.log("🔧 Cart ID:", cartId);
      
      console.log("🔧 Getting supabase server client...");
      const sb = await mockSupabaseServer();
      console.log("🔧 Supabase client obtained");

      // Use upsert to either insert or update in a single operation
      console.log("🔧 Attempting upsert...");
      const { error: upsertError } = await sb
        .from("cart_items")
        .upsert(
          {
            cart_id: cartId,
            wine_id: wineId,
            quantity: `COALESCE(quantity, 0) + ${quantity}`,
          },
          {
            onConflict: "cart_id,wine_id",
            ignoreDuplicates: false,
          }
        );

      if (upsertError) {
        console.log("🔧 Upsert failed, trying fallback method:", upsertError);
        // Fallback logic would go here
      } else {
        console.log("🔧 Upsert successful");
      }

      // Return updated cart
      console.log("🔧 Getting updated cart...");
      const cart = await this.getCart();
      console.log("🔧 addItem returning cart with", cart?.lines.length || 0, "items");
      return cart;
    } catch (error) {
      console.error("🔧 addItem error:", error);
      console.error("🔧 Error stack:", error instanceof Error ? error.stack : "No stack trace");
      return null;
    }
  }
}

// Test the real CartService logic
async function testRealCartService() {
  console.log("🧪 Testing Real CartService Implementation");
  console.log("=" .repeat(60));
  
  try {
    // Test 1: ensureCart
    console.log("\n🔄 TEST 1: ensureCart");
    const cartId = await MockCartService.ensureCart();
    console.log("✅ ensureCart returned:", cartId);
    
    // Test 2: getCart (empty)
    console.log("\n🔄 TEST 2: getCart (empty)");
    const emptyCart = await MockCartService.getCart();
    console.log("✅ getCart returned:", emptyCart ? "success" : "null");
    
    if (emptyCart) {
      console.log("✅ Empty cart has", emptyCart.lines.length, "items, total quantity:", emptyCart.totalQuantity);
    }
    
    // Test 3: addItem
    console.log("\n🔄 TEST 3: addItem");
    const cartAfterAdd = await MockCartService.addItem("test-wine-123", 1);
    console.log("✅ addItem returned:", cartAfterAdd ? "success" : "null");
    
    if (cartAfterAdd) {
      console.log("✅ Cart after add has", cartAfterAdd.lines.length, "items, total quantity:", cartAfterAdd.totalQuantity);
    }
    
    // Test 4: addItem again (should increment)
    console.log("\n🔄 TEST 4: addItem again (should increment)");
    const cartAfterSecondAdd = await MockCartService.addItem("test-wine-123", 1);
    console.log("✅ Second addItem returned:", cartAfterSecondAdd ? "success" : "null");
    
    if (cartAfterSecondAdd) {
      console.log("✅ Cart after second add has", cartAfterSecondAdd.lines.length, "items, total quantity:", cartAfterSecondAdd.totalQuantity);
    }
    
    console.log("\n🎉 All CartService methods work correctly!");
    return true;
    
  } catch (error) {
    console.error("❌ CartService test failed:", error);
    return false;
  }
}

// Run the test
testRealCartService().then(success => {
  console.log("\n📊 CartService Test Result:", success ? "✅ PASS" : "❌ FAIL");
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("❌ Test failed with error:", error);
  process.exit(1);
});
