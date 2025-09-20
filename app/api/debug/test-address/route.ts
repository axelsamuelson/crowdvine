import { NextResponse } from "next/server";
import { geocodeAddress, createFullAddress } from "@/lib/geocoding";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postcode, city, countryCode, street } = body;
    
    if (!postcode || !city || !countryCode) {
      return NextResponse.json(
        { error: "Missing required address fields: postcode, city, countryCode" },
        { status: 400 }
      );
    }
    
    console.log('🧪 Testing address:', { postcode, city, countryCode, street });
    
    // Create full address for geocoding
    const countryName = countryCode === 'SE' ? 'Sweden' : 
                       countryCode === 'NO' ? 'Norway' :
                       countryCode === 'DK' ? 'Denmark' :
                       countryCode === 'FI' ? 'Finland' :
                       countryCode === 'DE' ? 'Germany' :
                       countryCode === 'FR' ? 'France' :
                       countryCode === 'GB' ? 'United Kingdom' : countryCode;
    
    const fullAddress = createFullAddress({
      street: street || `${postcode} ${city}`,
      postcode,
      city,
      country: countryName
    });
    
    console.log(`📍 Geocoding address: "${fullAddress}"`);
    
    // Test geocoding
    const geocodeResult = await geocodeAddress(fullAddress);
    
    let geocodingInfo = null;
    let zoneMatching = [];
    
    if ('error' in geocodeResult) {
      console.error('❌ Geocoding failed:', geocodeResult.message);
      geocodingInfo = { error: geocodeResult.message };
    } else {
      console.log(`✅ Geocoded successfully: ${geocodeResult.lat}, ${geocodeResult.lon}`);
      geocodingInfo = {
        address: fullAddress,
        lat: geocodeResult.lat,
        lon: geocodeResult.lon,
        display_name: geocodeResult.display_name,
        country_code: geocodeResult.address?.country_code
      };
      
      // Get all delivery zones
      const sb = getSupabaseAdmin();
      const { data: zones, error: zonesError } = await sb
        .from('pallet_zones')
        .select('id, name, center_lat, center_lon, radius_km, country_code, zone_type')
        .eq('zone_type', 'delivery')
        .or(`country_code.eq.${countryCode},country_code.is.null`)
        .order('name');
        
      if (zonesError) {
        console.error('❌ Error fetching zones:', zonesError);
      } else {
        console.log(`📏 Checking ${zones?.length || 0} delivery zones...`);
        
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
              center_lon: zone.center_lon,
              country_code: zone.country_code
            });
          } else {
            console.log(`  ⚠️  ${zone.name}: Missing coordinates or radius`);
            zoneMatching.push({
              zone_name: zone.name,
              zone_id: zone.id,
              error: 'Missing coordinates or radius',
              center_lat: zone.center_lat,
              center_lon: zone.center_lon,
              radius_km: zone.radius_km,
              country_code: zone.country_code
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      input_address: { postcode, city, countryCode, street },
      full_address: fullAddress,
      geocoding: geocodingInfo,
      zone_matching: zoneMatching,
      summary: {
        geocoding_success: !('error' in geocodeResult),
        matching_zones: zoneMatching.filter(z => z.matches).length,
        total_zones_checked: zoneMatching.length
      }
    });
    
  } catch (error) {
    console.error('❌ Address test error:', error);
    return NextResponse.json(
      { 
        error: 'Address test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
