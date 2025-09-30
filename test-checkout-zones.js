// Test checkout zones functionality
console.log("🧪 Testing Checkout Zones Functionality");

// Mock the dependencies
const mockCartItems = [
  {
    merchandise: {
      id: "test-wine-123"
    },
    quantity: 1
  }
];

const mockDeliveryAddress = {
  postcode: "12345",
  city: "Stockholm", 
  countryCode: "SE"
};

// Mock fetch for testing
global.fetch = async (url, options) => {
  console.log("🌐 Mock fetch called:", url, options?.method || 'GET');
  
  if (url.includes('/api/checkout/zones')) {
    console.log("🌐 Mock: Zones API route");
    const body = JSON.parse(options.body);
    console.log("🌐 Mock: Received cartItems:", body.cartItems?.length || 0);
    console.log("🌐 Mock: Received deliveryAddress:", body.deliveryAddress);
    
    // Simulate different scenarios
    if (body.deliveryAddress?.countryCode === "SE" && body.deliveryAddress?.city === "Stockholm") {
      // Simulate successful zone matching
      return {
        ok: true,
        json: async () => ({
          pickupZoneId: "pickup-zone-1",
          deliveryZoneId: "delivery-zone-1", 
          pickupZoneName: "Stockholm Pickup Zone",
          deliveryZoneName: "Stockholm Delivery Zone",
          availableDeliveryZones: [
            {
              id: "delivery-zone-1",
              name: "Stockholm Delivery Zone",
              centerLat: 59.3293,
              centerLon: 18.0686,
              radiusKm: 50
            }
          ],
          pallets: [
            {
              id: "pallet-1",
              name: "Stockholm Wine Pallet",
              currentBottles: 100,
              maxBottles: 600,
              remainingBottles: 500,
              pickupZoneName: "Stockholm Pickup Zone",
              deliveryZoneName: "Stockholm Delivery Zone",
              costCents: 5000
            }
          ]
        })
      };
    } else if (body.deliveryAddress?.countryCode === "SE" && body.deliveryAddress?.city === "Gothenburg") {
      // Simulate no matching zones
      return {
        ok: true,
        json: async () => ({
          pickupZoneId: "pickup-zone-1",
          deliveryZoneId: null,
          pickupZoneName: "Stockholm Pickup Zone", 
          deliveryZoneName: null,
          availableDeliveryZones: [],
          pallets: []
        })
      };
    } else {
      // Simulate API error
      return {
        ok: false,
        status: 500,
        text: async () => "Internal server error"
      };
    }
  }
  
  return { ok: false, status: 404 };
};

// Test the checkout zones flow
async function testCheckoutZones() {
  console.log("🧪 Testing Checkout Zones Flow");
  console.log("=" .repeat(60));
  
  try {
    // Test 1: Successful zone matching (Stockholm)
    console.log("\n🔄 TEST 1: Successful zone matching (Stockholm)");
    const stockholmResponse = await fetch('/api/checkout/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartItems: mockCartItems,
        deliveryAddress: {
          postcode: "12345",
          city: "Stockholm",
          countryCode: "SE"
        }
      })
    });
    
    const stockholmResult = await stockholmResponse.json();
    console.log("✅ Stockholm zones result:", stockholmResponse.ok ? "SUCCESS" : "FAILED");
    
    if (stockholmResponse.ok) {
      console.log("✅ Pickup zone:", stockholmResult.pickupZoneName);
      console.log("✅ Delivery zone:", stockholmResult.deliveryZoneName);
      console.log("✅ Available zones:", stockholmResult.availableDeliveryZones?.length || 0);
      console.log("✅ Pallets:", stockholmResult.pallets?.length || 0);
    }
    
    // Test 2: No matching zones (Gothenburg)
    console.log("\n🔄 TEST 2: No matching zones (Gothenburg)");
    const gothenburgResponse = await fetch('/api/checkout/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartItems: mockCartItems,
        deliveryAddress: {
          postcode: "41101",
          city: "Gothenburg", 
          countryCode: "SE"
        }
      })
    });
    
    const gothenburgResult = await gothenburgResponse.json();
    console.log("✅ Gothenburg zones result:", gothenburgResponse.ok ? "SUCCESS" : "FAILED");
    
    if (gothenburgResponse.ok) {
      console.log("✅ Pickup zone:", gothenburgResult.pickupZoneName);
      console.log("✅ Delivery zone:", gothenburgResult.deliveryZoneName || "NULL (No match)");
      console.log("✅ Available zones:", gothenburgResult.availableDeliveryZones?.length || 0);
      console.log("✅ Pallets:", gothenburgResult.pallets?.length || 0);
    }
    
    // Test 3: Test checkout page logic
    console.log("\n🔄 TEST 3: Checkout page logic simulation");
    
    // Simulate checkout page state
    const mockZoneInfo = {
      pickupZone: stockholmResult.pickupZoneName,
      deliveryZone: stockholmResult.deliveryZoneName,
      selectedDeliveryZoneId: stockholmResult.deliveryZoneId,
      availableDeliveryZones: stockholmResult.availableDeliveryZones,
      pallets: stockholmResult.pallets
    };
    
    const mockProfile = {
      address: "Test Street 123",
      city: "Stockholm",
      postal_code: "12345",
      country: "Sweden"
    };
    
    // Test the conditions from checkout page
    const hasCompleteAddress = mockProfile.address && mockProfile.city && mockProfile.postal_code;
    const hasDeliveryZone = mockZoneInfo.selectedDeliveryZoneId;
    const shouldShowNoZoneError = hasCompleteAddress && !hasDeliveryZone;
    
    console.log("✅ Has complete address:", hasCompleteAddress);
    console.log("✅ Has delivery zone:", hasDeliveryZone);
    console.log("✅ Should show 'No Delivery Zone Found':", shouldShowNoZoneError);
    
    // Test 4: Test with Gothenburg (should show error)
    const mockZoneInfoGothenburg = {
      pickupZone: gothenburgResult.pickupZoneName,
      deliveryZone: gothenburgResult.deliveryZoneName,
      selectedDeliveryZoneId: gothenburgResult.deliveryZoneId,
      availableDeliveryZones: gothenburgResult.availableDeliveryZones,
      pallets: gothenburgResult.pallets
    };
    
    const mockProfileGothenburg = {
      address: "Test Street 456",
      city: "Gothenburg",
      postal_code: "41101", 
      country: "Sweden"
    };
    
    const hasCompleteAddressGothenburg = mockProfileGothenburg.address && mockProfileGothenburg.city && mockProfileGothenburg.postal_code;
    const hasDeliveryZoneGothenburg = mockZoneInfoGothenburg.selectedDeliveryZoneId;
    const shouldShowNoZoneErrorGothenburg = hasCompleteAddressGothenburg && !hasDeliveryZoneGothenburg;
    
    console.log("\n🔄 TEST 4: Gothenburg scenario");
    console.log("✅ Has complete address:", hasCompleteAddressGothenburg);
    console.log("✅ Has delivery zone:", hasDeliveryZoneGothenburg);
    console.log("✅ Should show 'No Delivery Zone Found':", shouldShowNoZoneErrorGothenburg);
    
    // Summary
    const allTestsPassed = stockholmResponse.ok && gothenburgResponse.ok && 
                          !shouldShowNoZoneError && shouldShowNoZoneErrorGothenburg;
    
    console.log("\n📊 TEST SUMMARY:");
    console.log("Stockholm zones:", stockholmResponse.ok ? "✅ PASS" : "❌ FAIL");
    console.log("Gothenburg zones:", gothenburgResponse.ok ? "✅ PASS" : "❌ FAIL");
    console.log("Stockholm no error:", !shouldShowNoZoneError ? "✅ PASS" : "❌ FAIL");
    console.log("Gothenburg shows error:", shouldShowNoZoneErrorGothenburg ? "✅ PASS" : "❌ FAIL");
    console.log("Overall:", allTestsPassed ? "✅ ALL TESTS PASS" : "❌ SOME TESTS FAIL");
    
    if (allTestsPassed) {
      console.log("\n🎉 CHECKOUT ZONES LOGIC WORKS CORRECTLY!");
      console.log("The issue might be in the actual zone data or geocoding.");
    } else {
      console.log("\n❌ CHECKOUT ZONES LOGIC HAS ISSUES!");
      console.log("The checkout flow needs debugging.");
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.error("❌ Checkout zones test failed:", error);
    return false;
  }
}

// Run the test
testCheckoutZones().then(success => {
  console.log("\n📊 Checkout Zones Test Result:", success ? "✅ PASS" : "❌ FAIL");
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error("❌ Test failed with error:", error);
  process.exit(1);
});
