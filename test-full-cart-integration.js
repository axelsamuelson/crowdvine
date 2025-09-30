// Full cart integration test - simulates the complete flow including server calls
console.log("🧪 Testing FULL Cart Integration Flow");

// Mock the complete cart flow
class MockCartFlow {
  constructor() {
    this.cart = {
      id: "cart-123",
      checkoutUrl: "/checkout",
      cost: { subtotalAmount: { amount: "0", currencyCode: "SEK" }, totalAmount: { amount: "0", currencyCode: "SEK" }, totalTaxAmount: { amount: "0", currencyCode: "SEK" } },
      totalQuantity: 0,
      lines: []
    };
    this.optimisticCart = this.cart;
  }

  // Simulate the cart reducer
  cartReducer(state, action) {
    const currentCart = state || this.createEmptyCart();

    switch (action.type) {
      case "ADD_ITEM": {
        const { variant, product, previousQuantity } = action.payload;
        console.log("🔍 ADD_ITEM - variant.id:", variant.id);
        
        // Normalize variant ID by removing -default suffix for comparison
        const normalizedVariantId = variant.id.replace("-default", "");
        console.log("🔍 ADD_ITEM - normalizedVariantId:", normalizedVariantId);
        
        const existingItem = currentCart.lines.find(
          (item) => item.merchandise.id === normalizedVariantId,
        );
        console.log("🔍 ADD_ITEM - existingItem found:", existingItem ? "YES" : "NO");
        
        const targetQuantity = previousQuantity + 1;

        const updatedLines = existingItem
          ? currentCart.lines.map((item) => {
              if (item.merchandise.id !== normalizedVariantId) return item;
              console.log("✅ UPDATING existing item quantity from", item.quantity, "to", targetQuantity);
              return {
                ...item,
                quantity: targetQuantity,
                cost: {
                  ...item.cost,
                  totalAmount: {
                    ...item.cost.totalAmount,
                    amount: (parseFloat(item.cost.totalAmount.amount) * targetQuantity / item.quantity).toFixed(2),
                  },
                },
              };
            })
          : [
              {
                id: `temp-${Date.now()}`,
                quantity: targetQuantity,
                cost: {
                  totalAmount: {
                    amount: (parseFloat(variant.price.amount) * targetQuantity).toFixed(2),
                    currencyCode: variant.price.currencyCode,
                  },
                },
                merchandise: {
                  id: normalizedVariantId, // Use normalized ID to match database format
                  title: variant.title,
                  selectedOptions: variant.selectedOptions,
                  product: product,
                },
              },
              ...currentCart.lines,
            ];

        return {
          ...currentCart,
          lines: updatedLines,
          totalQuantity: updatedLines.reduce((sum, line) => sum + line.quantity, 0),
        };
      }
      default:
        return currentCart;
    }
  }

  createEmptyCart() {
    return {
      id: "",
      checkoutUrl: "",
      cost: { subtotalAmount: { amount: "0", currencyCode: "USD" }, totalAmount: { amount: "0", currencyCode: "USD" }, totalTaxAmount: { amount: "0", currencyCode: "USD" } },
      totalQuantity: 0,
      lines: []
    };
  }

  // Simulate server addItem call
  async mockServerAddItem(variantId) {
    console.log("🌐 Server: addItem called with variantId:", variantId);
    
    // Extract base ID from variant ID (remove -default suffix)
    const baseId = variantId.replace("-default", "");
    console.log("🌐 Server: extracted baseId:", baseId);
    
    // Simulate database operation
    const existingCartItem = this.cart.lines.find(item => item.merchandise.id === baseId);
    
    if (existingCartItem) {
      // Update existing item
      existingCartItem.quantity += 1;
      existingCartItem.cost.totalAmount.amount = (parseFloat(existingCartItem.cost.totalAmount.amount) * existingCartItem.quantity / (existingCartItem.quantity - 1)).toFixed(2);
      console.log("🌐 Server: Updated existing item, new quantity:", existingCartItem.quantity);
    } else {
      // Add new item
      const newItem = {
        id: `server-item-${Date.now()}`,
        quantity: 1,
        cost: {
          totalAmount: { amount: "299.00", currencyCode: "SEK" }
        },
        merchandise: {
          id: baseId, // Database format (no -default)
          title: "Test Wine 2020",
          selectedOptions: [{ name: "Color", value: "Red" }],
          product: {
            id: baseId,
            title: "Test Wine 2020",
            handle: "test-wine-2020"
          }
        }
      };
      this.cart.lines.push(newItem);
      console.log("🌐 Server: Added new item");
    }
    
    // Update totals
    this.cart.totalQuantity = this.cart.lines.reduce((sum, line) => sum + line.quantity, 0);
    this.cart.cost.totalAmount.amount = this.cart.lines.reduce((sum, line) => sum + parseFloat(line.cost.totalAmount.amount), 0).toFixed(2);
    
    console.log("🌐 Server: Returning cart with", this.cart.lines.length, "items, total quantity:", this.cart.totalQuantity);
    return this.cart;
  }

  // Simulate the complete add flow
  async addItem(variant, product) {
    console.log("\n🚀 Starting addItem flow for:", variant.id);
    
    // Step 1: Calculate previous quantity (like in the real code)
    const normalizedVariantId = variant.id.replace("-default", "");
    const previousQuantity = this.optimisticCart?.lines.find((l) => l.merchandise.id === normalizedVariantId)?.quantity || 0;
    console.log("📊 Previous quantity:", previousQuantity);
    
    // Step 2: Optimistic update
    console.log("⚡ Performing optimistic update...");
    const optimisticAction = {
      type: "ADD_ITEM",
      payload: { variant, product, previousQuantity }
    };
    
    this.optimisticCart = this.cartReducer(this.optimisticCart, optimisticAction);
    console.log("⚡ Optimistic cart now has", this.optimisticCart.lines.length, "items");
    console.log("⚡ Optimistic total quantity:", this.optimisticCart.totalQuantity);
    
    // Step 3: Server update
    console.log("🌐 Performing server update...");
    const fresh = await this.mockServerAddItem(variant.id);
    
    // Step 4: Update cart with server response
    console.log("🔄 Updating cart with server response...");
    this.cart = fresh;
    this.optimisticCart = fresh; // In real code, this would be setCart(fresh)
    
    console.log("✅ Final cart has", this.cart.lines.length, "items");
    console.log("✅ Final total quantity:", this.cart.totalQuantity);
    
    return this.cart;
  }
}

// Test data
const mockVariant = {
  id: "wine-123-default", // Frontend format
  title: "Test Wine 750ml",
  price: { amount: "299.00", currencyCode: "SEK" },
  selectedOptions: [{ name: "Color", value: "Red" }]
};

const mockProduct = {
  id: "wine-123",
  title: "Test Wine 2020",
  handle: "test-wine-2020"
};

// Run the test
async function runTest() {
  const cartFlow = new MockCartFlow();
  
  console.log("📋 Initial state: Empty cart");
  
  // Test 1: First add
  console.log("\n" + "=".repeat(50));
  console.log("TEST 1: First add to cart");
  console.log("=".repeat(50));
  await cartFlow.addItem(mockVariant, mockProduct);
  
  // Test 2: Second add (should increment)
  console.log("\n" + "=".repeat(50));
  console.log("TEST 2: Second add to cart (should increment)");
  console.log("=".repeat(50));
  await cartFlow.addItem(mockVariant, mockProduct);
  
  // Test 3: Third add (should increment again)
  console.log("\n" + "=".repeat(50));
  console.log("TEST 3: Third add to cart (should increment again)");
  console.log("=".repeat(50));
  await cartFlow.addItem(mockVariant, mockProduct);
  
  // Final verification
  console.log("\n" + "=".repeat(50));
  console.log("FINAL VERIFICATION");
  console.log("=".repeat(50));
  console.log("Final cart items:", cartFlow.cart.lines.length);
  console.log("Final total quantity:", cartFlow.cart.totalQuantity);
  
  if (cartFlow.cart.lines.length === 1 && cartFlow.cart.totalQuantity === 3) {
    console.log("\n🎉 SUCCESS! Cart flow works correctly!");
    console.log("✅ Single item with quantity 3");
    console.log("✅ No duplicate items");
    console.log("✅ Proper quantity increment");
  } else {
    console.log("\n❌ FAILURE! Cart flow has issues:");
    console.log("❌ Expected: 1 item with quantity 3");
    console.log("❌ Actual:", cartFlow.cart.lines.length, "items with total quantity", cartFlow.cart.totalQuantity);
  }
}

runTest().catch(console.error);
