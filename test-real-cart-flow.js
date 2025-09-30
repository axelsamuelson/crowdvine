// Real cart flow test - simulates the actual cart context behavior
console.log("🧪 Testing REAL Cart Flow");

// Mock the cart reducer function
function cartReducer(state, action) {
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
      console.log("🔍 ADD_ITEM - variant.id:", variant.id);
      console.log("🔍 ADD_ITEM - previousQuantity:", previousQuantity);
      
      // Normalize variant ID by removing -default suffix for comparison
      const normalizedVariantId = variant.id.replace("-default", "");
      console.log("🔍 ADD_ITEM - normalizedVariantId:", normalizedVariantId);
      
      const existingItem = currentCart.lines.find(
        (item) => item.merchandise.id === normalizedVariantId,
      );
      console.log("🔍 ADD_ITEM - existingItem found:", existingItem ? "YES" : "NO");
      
      const targetQuantity = previousQuantity + 1;
      console.log("🔍 ADD_ITEM - targetQuantity:", targetQuantity);

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

      console.log("🔍 ADD_ITEM - updatedLines length:", updatedLines.length);
      console.log("🔍 ADD_ITEM - first item quantity:", updatedLines[0]?.quantity);
      
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

// Simulate database cart (what comes from server)
const mockDatabaseCart = {
  id: "cart-123",
  checkoutUrl: "/checkout",
  cost: { subtotalAmount: { amount: "299.00", currencyCode: "SEK" }, totalAmount: { amount: "299.00", currencyCode: "SEK" }, totalTaxAmount: { amount: "0.00", currencyCode: "SEK" } },
  totalQuantity: 1,
  lines: [
    {
      id: "cart-item-1",
      quantity: 1,
      cost: {
        totalAmount: { amount: "299.00", currencyCode: "SEK" }
      },
      merchandise: {
        id: "wine-123", // Database format (no -default)
        title: "Test Wine 2020",
        selectedOptions: [{ name: "Color", value: "Red" }],
        product: mockProduct
      }
    }
  ]
};

console.log("\n📋 Initial State:");
console.log("Database cart has", mockDatabaseCart.lines.length, "items");
console.log("First item quantity:", mockDatabaseCart.lines[0].quantity);

// Test 1: First add (should find existing item and increment)
console.log("\n🔄 TEST 1: First add to cart");
const previousQuantity = mockDatabaseCart.lines.find((l) => l.merchandise.id === mockVariant.id.replace("-default", ""))?.quantity || 0;
console.log("Previous quantity found:", previousQuantity);

const action1 = {
  type: "ADD_ITEM",
  payload: { variant: mockVariant, product: mockProduct, previousQuantity }
};

const result1 = cartReducer(mockDatabaseCart, action1);
console.log("Result 1 - Total items:", result1.lines.length);
console.log("Result 1 - First item quantity:", result1.lines[0].quantity);
console.log("Result 1 - Total quantity:", result1.totalQuantity);

// Test 2: Second add (should increment again)
console.log("\n🔄 TEST 2: Second add to cart");
const previousQuantity2 = result1.lines.find((l) => l.merchandise.id === mockVariant.id.replace("-default", ""))?.quantity || 0;
console.log("Previous quantity found:", previousQuantity2);

const action2 = {
  type: "ADD_ITEM",
  payload: { variant: mockVariant, product: mockProduct, previousQuantity: previousQuantity2 }
};

const result2 = cartReducer(result1, action2);
console.log("Result 2 - Total items:", result2.lines.length);
console.log("Result 2 - First item quantity:", result2.lines[0].quantity);
console.log("Result 2 - Total quantity:", result2.totalQuantity);

// Test 3: Add different product (should create new item)
console.log("\n🔄 TEST 3: Add different product");
const mockVariant2 = {
  id: "wine-456-default",
  title: "Another Wine 750ml",
  price: { amount: "399.00", currencyCode: "SEK" },
  selectedOptions: [{ name: "Color", value: "White" }]
};

const mockProduct2 = {
  id: "wine-456",
  title: "Another Wine 2021",
  handle: "another-wine-2021"
};

const previousQuantity3 = result2.lines.find((l) => l.merchandise.id === mockVariant2.id.replace("-default", ""))?.quantity || 0;
console.log("Previous quantity found for new product:", previousQuantity3);

const action3 = {
  type: "ADD_ITEM",
  payload: { variant: mockVariant2, product: mockProduct2, previousQuantity: previousQuantity3 }
};

const result3 = cartReducer(result2, action3);
console.log("Result 3 - Total items:", result3.lines.length);
console.log("Result 3 - First item quantity:", result3.lines[0].quantity);
console.log("Result 3 - Second item quantity:", result3.lines[1]?.quantity);
console.log("Result 3 - Total quantity:", result3.totalQuantity);

// Summary
console.log("\n📊 SUMMARY:");
console.log("✅ Test 1 (first add):", result1.lines.length === 1 && result1.lines[0].quantity === 2 ? "PASS" : "FAIL");
console.log("✅ Test 2 (second add):", result2.lines.length === 1 && result2.lines[0].quantity === 3 ? "PASS" : "FAIL");
console.log("✅ Test 3 (different product):", result3.lines.length === 2 ? "PASS" : "FAIL");

if (result1.lines.length === 1 && result1.lines[0].quantity === 2 && 
    result2.lines.length === 1 && result2.lines[0].quantity === 3 && 
    result3.lines.length === 2) {
  console.log("\n🎉 ALL TESTS PASSED! Cart logic should work correctly.");
} else {
  console.log("\n❌ SOME TESTS FAILED! There are still issues with the cart logic.");
}
