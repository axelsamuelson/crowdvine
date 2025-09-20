import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { geocodeAddress, createFullAddress } from "@/lib/geocoding";

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function GET() {
  try {
    console.log('🔍 Debugging delivery zones...');
    
    const sb = getSupabaseAdmin();
    
    // 1. Check all delivery zones in database
    console.log('📍 Checking all delivery zones in database...');
    const { data: zones, error: zonesError } = await sb
      .from('pallet_zones')
      .select('id, name, center_lat, center_lon, radius_km, country_code, zone_type')
      .eq('zone_type', 'delivery')
      .order('name');
      
    if (zonesError) {
      console.error('❌ Error fetching zones:', zonesError);
      return NextResponse.json({ error: 'Failed to fetch zones', details: zonesError }, { status: 500 });
    }
    
    console.log(`✅ Found ${zones?.length || 0} delivery zones`);
    
    // 2. Check pickup zones too
    console.log('🚚 Checking pickup zones...');
    const { data: pickupZones, error: pickupError } = await sb
      .from('pallet_zones')
      .select('id, name, center_lat, center_lon, radius_km, country_code, zone_type')
      .eq('zone_type', 'pickup')
      .order('name');
      
    if (pickupError) {
      console.error('❌ Error fetching pickup zones:', pickupError);
      return NextResponse.json({ error: 'Failed to fetch pickup zones', details: pickupError }, { status: 500 });
    }
    
    console.log(`✅ Found ${pickupZones?.length || 0} pickup zones`);

    // 3. Test geocoding with Stockholm address
    console.log('🌍 Testing geocoding with Stockholm address...');
    const testAddress = createFullAddress({
      street: 'Storgatan 1',
      postcode: '11151',
      city: 'Stockholm',
      country: 'Sweden'
    });
    
    console.log(`📍 Geocoding: "${testAddress}"`);
    const geocodeResult = await geocodeAddress(testAddress);
    
    let geocodingInfo = null;
    let zoneMatching = [];
    
    if ('error' in geocodeResult) {
      console.error('❌ Geocoding failed:', geocodeResult.message);
      geocodingInfo = { error: geocodeResult.message };
    } else {
      console.log(`✅ Geocoded successfully: ${geocodeResult.lat}, ${geocodeResult.lon}`);
      geocodingInfo = {
        address: testAddress,
        lat: geocodeResult.lat,
        lon: geocodeResult.lon,
        display_name: geocodeResult.display_name
      };
      
      // 4. Check which zones this address would match
      console.log('📏 Checking zone matching...');
      const addressLat = geocodeResult.lat;
      const addressLon = geocodeResult.lon;
      
      for (const zone of zones || []) {
        if (zone.center_lat && zone.center_lon && zone.radius_km) {
          const distance = calculateDistance(
            addressLat, addressLon,
            zone.center_lat, zone.center_lon
          );
          
          const matches = distance <= zone.radius_km;
          console.log(`  ${matches ? '✅' : '❌'} ${zone.name}: ${distance.toFixed(2)}km (radius: ${zone.radius_km}km) ${matches ? 'MATCHES' : 'OUT OF RANGE'}`);
          
          zoneMatching.push({
            zone_name: zone.name,
            zone_id: zone.id,
            distance_km: parseFloat(distance.toFixed(2)),
            radius_km: zone.radius_km,
            matches: matches,
            center_lat: zone.center_lat,
            center_lon: zone.center_lon
          });
        } else {
          console.log(`  ⚠️  ${zone.name}: Missing coordinates or radius`);
          zoneMatching.push({
            zone_name: zone.name,
            zone_id: zone.id,
            error: 'Missing coordinates or radius',
            center_lat: zone.center_lat,
            center_lon: zone.center_lon,
            radius_km: zone.radius_km
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      delivery_zones: zones || [],
      pickup_zones: pickupZones || [],
      geocoding_test: geocodingInfo,
      zone_matching: zoneMatching,
      summary: {
        total_delivery_zones: zones?.length || 0,
        total_pickup_zones: pickupZones?.length || 0,
        geocoding_success: !('error' in geocodeResult),
        matching_zones: zoneMatching.filter(z => z.matches).length
      }
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
