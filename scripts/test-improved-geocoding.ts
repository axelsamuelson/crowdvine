import { geocodeAddress, geocodeFromFields } from "../lib/geocoding";

async function testGeocoding() {
  console.log("🧪 Testing improved geocoding functionality...");

  const testCases = [
    // Swedish addresses
    { type: "Full address", input: "Grevgatan 49, 11458 Stockholm" },
    { type: "City only", input: "Stockholm, Sweden" },

    // French addresses
    { type: "French city", input: "Béziers, France" },
    { type: "French city 2", input: "Montpellier, France" },
    { type: "French city 3", input: "Paris, France" },

    // Separate fields
    { type: "Separate fields", fields: { city: "Béziers", country: "France" } },
    {
      type: "Separate fields 2",
      fields: { city: "Montpellier", country: "France" },
    },
    {
      type: "Separate fields 3",
      fields: {
        street: "Route de Narbonne",
        city: "Béziers",
        country: "France",
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📍 Testing: ${testCase.type}`);

    try {
      let result;

      if ("input" in testCase) {
        console.log(`   Input: ${testCase.input}`);
        result = await geocodeAddress(testCase.input);
      } else if ("fields" in testCase) {
        console.log(`   Fields:`, testCase.fields);
        result = await geocodeFromFields(testCase.fields);
      }

      if ("error" in result!) {
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
