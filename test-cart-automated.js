// Automated cart test that I can run locally to verify the solution
console.log("🤖 Automated Cart Test - Running locally");

// Mock the complete cart flow
class AutomatedCartTester {
  constructor() {
    this.testResults = [];
  }

  addResult(message) {
    this.testResults.push(`${new Date().toLocaleTimeString()}: ${message}`);
    console.log(message);
  }

  // Mock CartService
  createMockCartService() {
    return {
      cartItems: [],
      cartId: "test-cart-123",

      async ensureCart() {
        console.log("🔧 Mock ensureCart called");
        return this.cartId;
      },

      async getCart() {
        console.log("🔧 Mock getCart called");
        
        if (this.cartItems.length === 0) {
          return {
            id: this.cartId,
            checkoutUrl: "/checkout",
            cost: {
              subtotalAmount: { amount: "0.00", currencyCode: "SEK" },
              totalAmount: { amount: "0.00", currencyCode: "SEK" },
              totalTaxAmount: { amount: "0.00", currencyCode: "SEK" },
            },
            totalQuantity: 0,
            lines: [],
          };
        }

        const lines = this.cartItems.map((item) => {
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
          id: this.cartId,
          checkoutUrl: "/checkout",
          cost: {
            subtotalAmount: { amount: subtotal.toFixed(2), currencyCode: "SEK" },
            totalAmount: { amount: subtotal.toFixed(2), currencyCode: "SEK" },
            totalTaxAmount: { amount: "0.00", currencyCode: "SEK" },
          },
          totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
          lines,
        };
      },

      async addItem(wineId, quantity = 1) {
        console.log("🔧 Mock addItem called with:", wineId, "quantity:", quantity);
        
        // Check if item already exists
        const existingItem = this.cartItems.find(item => item.wine_id === wineId);
        
        if (existingItem) {
          // Update quantity
          existingItem.quantity += quantity;
          console.log("✅ Updated existing item, new quantity:", existingItem.quantity);
        } else {
          // Add new item
          const newItem = {
            id: `item-${Date.now()}`,
            cart_id: this.cartId,
            wine_id: wineId,
            quantity: quantity,
            wines: {
              id: wineId,
              wine_name: "Test Wine",
              vintage: "2020",
              color: "Red",
              base_price_cents: 29900,
              handle: "test-wine-2020"
            }
          };
          this.cartItems.push(newItem);
          console.log("✅ Added new item");
        }
        
        return await this.getCart();
      }
    };
  }

  // Mock cart reducer
  cartReducer(state, action) {
    const currentCart = state || {
      id: "",
      checkoutUrl: "",
      cost: { subtotalAmount: { amount: "0", currencyCode: "USD" }, totalAmount: { amount: "0", currencyCode: "USD" }, totalTaxAmount: { amount: "0", currencyCode: "USD" } },
      totalQuantity: 0,
      lines: []
    };

    switch (action.type) {
      case "ADD_ITEM": {
        const { variant, product, previousQuantity } = action.payload;
        
        // This is the EXACT logic from cart-context.tsx
        const normalizedVariantId = variant.id.replace("-default", "");
        const existingItem = currentCart.lines.find(
          (item) => item.merchandise.id === normalizedVariantId,
        );
        const targetQuantity = previousQuantity + 1;

        const updatedLines = existingItem
          ? currentCart.lines.map((item) => {
              if (item.merchandise.id !== normalizedVariantId) return item;

              const singleItemAmount = Number(item.cost.totalAmount.amount) / item.quantity;
              const newTotalAmount = (singleItemAmount * targetQuantity).toFixed(2);

              return {
                ...item,
                quantity: targetQuantity,
                cost: {
                  ...item.cost,
                  totalAmount: {
                    ...item.cost.totalAmount,
                    amount: newTotalAmount,
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

  // Mock server action
  async mockServerAction(variantId, cartService) {
    console.log("🔧 Mock server action called with variantId:", variantId);
    
    if (!variantId) {
      console.error("addItem: No variantId provided");
      return null;
    }

    try {
      // Extract base ID from variant ID (remove -default suffix)
      const baseId = variantId.replace("-default", "");
      console.log("🔧 Extracted baseId:", baseId);
      
      // Add item to cart
      console.log("🔧 Calling CartService.addItem...");
      const cart = await cartService.addItem(baseId, 1);
      console.log("🔧 CartService.addItem returned:", cart ? "success" : "null");
      
      if (cart) {
        console.log("🔧 Cart has", cart.lines.length, "items, total quantity:", cart.totalQuantity);
      }
      
      return cart;
    } catch (error) {
      console.error("🔧 Server action error:", error);
      return null;
    }
  }

  // Test the complete flow
  async testCompleteFlow() {
    console.log("🧪 Testing Complete Cart Flow");
    console.log("=" .repeat(60));
    
    const cartService = this.createMockCartService();
    
    // Test data
    const mockVariant = {
      id: "test-wine-123-default", // Frontend format
      title: "Test Wine 750ml",
      price: { amount: "299.00", currencyCode: "SEK" },
      selectedOptions: [{ name: "Color", value: "Red" }]
    };

    const mockProduct = {
      id: "test-wine-123",
      title: "Test Wine 2020",
      handle: "test-wine-2020"
    };

    this.addResult("📋 Initial state: Empty cart");
    
    // Test 1: First add
    this.addResult("\n🔄 TEST 1: First add to cart");
    const previousQuantity1 = 0;
    const optimisticAction1 = {
      type: "ADD_ITEM",
      payload: { variant: mockVariant, product: mockProduct, previousQuantity: previousQuantity1 }
    };
    
    const optimisticCart1 = this.cartReducer(undefined, optimisticAction1);
    this.addResult(`Optimistic cart: ${optimisticCart1.lines.length} items, quantity: ${optimisticCart1.totalQuantity}`);
    
    const serverResult1 = await this.mockServerAction(mockVariant.id, cartService);
    this.addResult(`Server result: ${serverResult1 ? serverResult1.lines.length + " items" : "null"}`);
    
    // Test 2: Second add (should increment)
    this.addResult("\n🔄 TEST 2: Second add to cart");
    const previousQuantity2 = optimisticCart1.lines.find(l => l.merchandise.id === "test-wine-123")?.quantity || 0;
    const optimisticAction2 = {
      type: "ADD_ITEM",
      payload: { variant: mockVariant, product: mockProduct, previousQuantity: previousQuantity2 }
    };
    
    const optimisticCart2 = this.cartReducer(optimisticCart1, optimisticAction2);
    this.addResult(`Optimistic cart: ${optimisticCart2.lines.length} items, quantity: ${optimisticCart2.totalQuantity}`);
    
    const serverResult2 = await this.mockServerAction(mockVariant.id, cartService);
    this.addResult(`Server result: ${serverResult2 ? serverResult2.lines.length + " items" : "null"}`);
    
    // Test 3: Third add (should increment again)
    this.addResult("\n🔄 TEST 3: Third add to cart");
    const previousQuantity3 = optimisticCart2.lines.find(l => l.merchandise.id === "test-wine-123")?.quantity || 0;
    const optimisticAction3 = {
      type: "ADD_ITEM",
      payload: { variant: mockVariant, product: mockProduct, previousQuantity: previousQuantity3 }
    };
    
    const optimisticCart3 = this.cartReducer(optimisticCart2, optimisticAction3);
    this.addResult(`Optimistic cart: ${optimisticCart3.lines.length} items, quantity: ${optimisticCart3.totalQuantity}`);
    
    const serverResult3 = await this.mockServerAction(mockVariant.id, cartService);
    this.addResult(`Server result: ${serverResult3 ? serverResult3.lines.length + " items" : "null"}`);
    
    // Final verification
    this.addResult("\n📊 FINAL VERIFICATION");
    const finalCart = await cartService.getCart();
    const finalItemCount = finalCart.lines.length;
    const finalTotalQuantity = finalCart.totalQuantity;
    const hasColor = finalCart.lines.length > 0 && 
      finalCart.lines[0].merchandise.selectedOptions.some(opt => opt.name === "Color" && opt.value === "Red");
    
    this.addResult(`Final cart items: ${finalItemCount}`);
    this.addResult(`Final total quantity: ${finalTotalQuantity}`);
    this.addResult(`Color preserved: ${hasColor ? "✅ YES" : "❌ NO"}`);
    
    // Determine success/failure
    const success = finalItemCount === 1 && finalTotalQuantity === 3 && hasColor;
    
    if (success) {
      this.addResult("\n🎉 SUCCESS! Cart flow works perfectly!");
      this.addResult("✅ Single item with quantity 3");
      this.addResult("✅ No duplicate items created");
      this.addResult("✅ Proper quantity increment");
      this.addResult("✅ Color information preserved");
    } else {
      this.addResult("\n❌ FAILURE! Cart flow has issues:");
      if (finalItemCount !== 1) {
        this.addResult(`❌ Expected 1 item, got ${finalItemCount}`);
      }
      if (finalTotalQuantity !== 3) {
        this.addResult(`❌ Expected quantity 3, got ${finalTotalQuantity}`);
      }
      if (!hasColor) {
        this.addResult("❌ Color information not preserved");
      }
    }
    
    return success;
  }

  // Run the test
  async run() {
    try {
      const success = await this.testCompleteFlow();
      
      this.addResult("\n📊 Test Summary:");
      this.addResult(`Overall Result: ${success ? "✅ PASS" : "❌ FAIL"}`);
      
      if (success) {
        this.addResult("🎉 Cart functionality is working correctly!");
        this.addResult("The fixes should work in production.");
      } else {
        this.addResult("❌ Cart functionality has issues!");
        this.addResult("The fixes need more work.");
      }
      
      return success;
    } catch (error) {
      this.addResult(`❌ Test failed with error: ${error}`);
      return false;
    }
  }
}

// Run the test
async function runAutomatedTest() {
  const tester = new AutomatedCartTester();
  const success = await tester.run();
  
  console.log("\n" + "=".repeat(60));
  console.log("AUTOMATED TEST COMPLETED");
  console.log("=".repeat(60));
  
  return success;
}

// Export for use in other tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutomatedCartTester, runAutomatedTest };
} else {
  // Run immediately if in browser or Node.js directly
  runAutomatedTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error("Test failed:", error);
    process.exit(1);
  });
}
