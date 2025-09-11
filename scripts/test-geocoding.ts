import { geocodeAddress } from "../lib/geocoding";

async function testGeocoding() {
  console.log("🧪 Testing geocoding functionality...");

  const testAddresses = [
    "Grevgatan 49, 11458 Stockholm",
    "Centralplan 15, 111 20 Stockholm",
    "Drottninggatan 4, 652 24 Karlstad"
  ];

  for (const address of testAddresses) {
    console.log(`\n📍 Testing: ${address}`);
    
    try {
      const result = await geocodeAddress(address);
      
      if ('error' in result) {
        console.log(`❌ Error: ${result.message}`);
      } else {
        console.log(`✅ Success:`);
        console.log(`   Lat: ${result.lat}`);
        console.log(`   Lon: ${result.lon}`);
        console.log(`   Display: ${result.display_name}`);
        if (result.address?.city) {
          console.log(`   City: ${result.address.city}`);
        }
      }
    } catch (error) {
      console.log(`❌ Exception: ${error}`);
    }
  }
}

testGeocoding();
