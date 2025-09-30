// Test zones creation and functionality
console.log("🧪 Testing Zones Creation and Functionality");

const baseUrl = "https://pactwines.com";

async function testZonesCreation() {
  console.log("🧪 Testing Zones Creation and Functionality");
  console.log("=" .repeat(60));
  
  try {
    // Test 1: Create zones
    console.log("\n🔄 TEST 1: Create Sweden delivery zones");
    const createResponse = await fetch(`${baseUrl}/api/admin/create-zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log("✅ Create zones result:", createResult.success ? "SUCCESS" : "FAILED");
      console.log("✅ Message:", createResult.message);
      console.log("✅ Created zones:", createResult.createdZones?.length || 0);
      console.log("✅ Total zones:", createResult.totalZones);
      
      if (createResult.errors && createResult.errors.length > 0) {
        console.log("⚠️  Errors:", createResult.errors);
      }
    } else {
      console.log("❌ Create zones failed:", createResponse.status);
      const errorText = await createResponse.text();
      console.log("❌ Error:", errorText);
    }
    
    // Test 2: Test zone matching for Swedish cities
    console.log("\n🔄 TEST 2: Test zone matching for Swedish cities");
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
    
    // Test 3: Test remote address (should not have zone)
    console.log("\n🔄 TEST 3: Test remote address (should not have zone)");
    try {
      const remoteResponse = await fetch(`${baseUrl}/api/checkout/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: [{ merchandise: { id: "test-wine-123" }, quantity: 1 }],
          deliveryAddress: {
            city: "Remote City",
            postcode: "12345",
            countryCode: "SE"
          }
        })
      });
      
      if (remoteResponse.ok) {
        const remoteResult = await remoteResponse.json();
        const remoteHasZone = remoteResult.deliveryZoneName !== null;
        
        console.log(`✅ Remote zone found: ${remoteHasZone ? 'YES' : 'NO'}`);
        console.log(`✅ Expected: NO (should not have zone)`);
        
        const remoteTestPassed = !remoteHasZone;
        
        // Summary
        const allTestsPassed = createResponse.ok && zoneMatchingPassed && remoteTestPassed;
        
        console.log("\n📊 ZONES CREATION TEST SUMMARY:");
        console.log("Create zones:", createResponse.ok ? "✅ PASS" : "❌ FAIL");
        console.log("Zone matching:", zoneMatchingPassed ? "✅ PASS" : "❌ FAIL");
        console.log("Remote address:", remoteTestPassed ? "✅ PASS" : "❌ FAIL");
        console.log("Overall:", allTestsPassed ? "✅ ALL TESTS PASS" : "❌ SOME TESTS FAIL");
        
        if (allTestsPassed) {
          console.log("\n🎉 ZONES CREATION IS WORKING!");
          console.log("The 'No Delivery Zone Found' error should be resolved for Swedish addresses.");
          console.log("\n💡 WHAT WAS FIXED:");
          console.log("1. Created delivery zones for major Swedish cities");
          console.log("2. Zones are now available in the database");
          console.log("3. Zone matching should work for Swedish addresses");
          console.log("\n🧪 NEXT STEPS:");
          console.log("1. Test checkout with Swedish address");
          console.log("2. Verify 'No Delivery Zone Found' error is gone");
          console.log("3. Complete checkout process");
        } else {
          console.log("\n❌ ZONES CREATION STILL HAS ISSUES!");
          console.log("Some tests failed and the fix needs more work.");
        }
        
        return allTestsPassed;
      } else {
        console.log(`❌ Remote test failed: ${remoteResponse.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Remote test error: ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Zones creation test failed:", error);
    return false;
  }
}

// Run the test
testZonesCreation().then(success => {
  console.log("\n📊 Zones Creation Test Result:", success ? "✅ PASS" : "❌ FAIL");
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("❌ Test failed with error:", error);
  process.exit(1);
});
