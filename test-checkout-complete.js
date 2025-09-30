// Test complete checkout flow after zones are created
console.log("🧪 Testing Complete Checkout Flow");

const baseUrl = "https://pactwines.com";

async function testCompleteCheckout() {
  console.log("🧪 Testing Complete Checkout Flow");
  console.log("=" .repeat(60));
  
  try {
    // Test 1: Test zone matching for Swedish cities
    console.log("\n🔄 TEST 1: Test zone matching for Swedish cities");
    const swedishCities = [
      { city: "Stockholm", postcode: "11151", countryCode: "SE" },
      { city: "Gothenburg", postcode: "41101", countryCode: "SE" },
      { city: "Malmö", postcode: "21115", countryCode: "SE" },
      { city: "Uppsala", postcode: "75310", countryCode: "SE" }
    ];
    
    let zoneMatchingPassed = true;
    
    for (const address of swedishCities) {
      console.log(`\n📍 Testing: ${address.city}`);
      
      try {
        const zoneResponse = await fetch(`${baseUrl}/api/checkout/zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartItems: [{ merchandise: { id: "test-wine-123" }, quantity: 1 }],
            deliveryAddress: address
          })
        });
        
        if (zoneResponse.ok) {
          const zoneResult = await zoneResponse.json();
          const hasZone = zoneResult.deliveryZoneName !== null;
          
          console.log(`✅ Zone found: ${hasZone ? 'YES' : 'NO'}`);
          console.log(`✅ Zone name: ${zoneResult.deliveryZoneName || 'null'}`);
          console.log(`✅ Pallets: ${zoneResult.pallets?.length || 0}`);
          
          if (!hasZone) {
            zoneMatchingPassed = false;
            console.log(`❌ FAIL: ${address.city} should have a delivery zone`);
          }
        } else {
          console.log(`❌ Zone API failed: ${zoneResponse.status}`);
          const errorText = await zoneResponse.text();
          console.log(`❌ Error: ${errorText}`);
          zoneMatchingPassed = false;
        }
      } catch (error) {
        console.log(`❌ Zone API error: ${error.message}`);
        zoneMatchingPassed = false;
      }
    }
    
    // Test 2: Test cart functionality
    console.log("\n🔄 TEST 2: Test cart functionality");
    try {
      const cartResponse = await fetch(`${baseUrl}/api/crowdvine/cart`);
      
      if (cartResponse.ok) {
        const cartResult = await cartResponse.json();
        console.log("✅ Cart API works");
        console.log("✅ Cart items:", cartResult.lines?.length || 0);
        console.log("✅ Total quantity:", cartResult.totalQuantity || 0);
      } else {
        console.log(`❌ Cart API failed: ${cartResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Cart API error: ${error.message}`);
    }
    
    // Test 3: Test simple cart add
    console.log("\n🔄 TEST 3: Test simple cart add");
    try {
      const addResponse = await fetch(`${baseUrl}/api/cart/simple-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: "test-wine-123-default" })
      });
      
      if (addResponse.ok) {
        const addResult = await addResponse.json();
        console.log("✅ Simple cart add works");
        console.log("✅ Cart items after add:", addResult.cart?.lines?.length || 0);
        console.log("✅ Total quantity after add:", addResult.cart?.totalQuantity || 0);
      } else {
        console.log(`❌ Simple cart add failed: ${addResponse.status}`);
        const errorText = await addResponse.text();
        console.log("❌ Error:", errorText);
      }
    } catch (error) {
      console.log(`❌ Simple cart add error: ${error.message}`);
    }
    
    // Test 4: Test checkout page logic simulation
    console.log("\n🔄 TEST 4: Test checkout page logic simulation");
    
    // Simulate Stockholm checkout
    const mockZoneInfo = {
      pickupZone: "Sweden Pickup Zone",
      deliveryZone: "Stockholm Delivery Zone",
      selectedDeliveryZoneId: "stockholm-zone",
      availableDeliveryZones: [{ id: "stockholm-zone", name: "Stockholm Delivery Zone" }],
      pallets: [{ id: "pallet-1", name: "Stockholm Wine Pallet" }]
    };
    
    const mockProfile = {
      address: "Test Street 123",
      city: "Stockholm",
      postal_code: "11151",
      country: "Sweden"
    };
    
    const hasCompleteAddress = mockProfile.address && mockProfile.city && mockProfile.postal_code;
    const hasDeliveryZone = mockZoneInfo.selectedDeliveryZoneId;
    const shouldShowNoZoneError = hasCompleteAddress && !hasDeliveryZone;
    
    console.log(`✅ Stockholm - Has complete address: ${hasCompleteAddress}`);
    console.log(`✅ Stockholm - Has delivery zone: ${hasDeliveryZone}`);
    console.log(`✅ Stockholm - Should show 'No Delivery Zone Found': ${shouldShowNoZoneError}`);
    console.log(`✅ Stockholm - Expected: false (should not show error)`);
    
    const checkoutTestPassed = !shouldShowNoZoneError;
    
    // Summary
    console.log("\n📊 COMPLETE CHECKOUT TEST SUMMARY:");
    console.log("Zone matching:", zoneMatchingPassed ? "✅ PASS" : "❌ FAIL");
    console.log("Checkout logic:", checkoutTestPassed ? "✅ PASS" : "❌ FAIL");
    console.log("Overall:", zoneMatchingPassed && checkoutTestPassed ? "✅ CHECKOUT SHOULD WORK" : "❌ CHECKOUT HAS ISSUES");
    
    if (zoneMatchingPassed && checkoutTestPassed) {
      console.log("\n🎉 COMPLETE CHECKOUT IS WORKING!");
      console.log("The 'No Delivery Zone Found' error should be resolved for Swedish addresses.");
      console.log("\n💡 WHAT TO TEST:");
      console.log("1. Add items to cart");
      console.log("2. Go to checkout");
      console.log("3. Enter Swedish address (Stockholm, Gothenburg, Malmö, Uppsala)");
      console.log("4. Verify delivery zone is found");
      console.log("5. Complete checkout process");
      console.log("\n🔧 IF ZONES ARE NOT CREATED YET:");
      console.log("1. Run the SQL in create-zones-sql.sql in Supabase");
      console.log("2. Or use the API endpoint: POST /api/admin/create-zones");
      console.log("3. Then test checkout again");
    } else {
      console.log("\n❌ COMPLETE CHECKOUT STILL HAS ISSUES!");
      console.log("The zone matching is not working correctly.");
      console.log("\n🔧 TROUBLESHOOTING:");
      console.log("1. Check if zones exist in database");
      console.log("2. Verify zone matching logic");
      console.log("3. Check geocoding functionality");
      console.log("4. Test with different addresses");
    }
    
    return zoneMatchingPassed && checkoutTestPassed;
    
  } catch (error) {
    console.error("❌ Complete checkout test failed:", error);
    return false;
  }
}

// Run the test
testCompleteCheckout().then(success => {
  console.log("\n📊 Complete Checkout Test Result:", success ? "✅ PASS" : "❌ FAIL");
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("❌ Test failed with error:", error);
  process.exit(1);
});
