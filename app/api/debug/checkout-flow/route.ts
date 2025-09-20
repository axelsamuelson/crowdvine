import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";
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

export async function POST(request: Request) {
  try {
    console.log('🔍 COMPREHENSIVE CHECKOUT FLOW DEBUG START');
    
    const body = await request.json();
    const { postcode, city, countryCode, street } = body;
    
    if (!postcode || !city || !countryCode) {
      return NextResponse.json(
        { error: "Missing required address fields: postcode, city, countryCode" },
        { status: 400 }
      );
    }
    
    const debugResults: any = {
      step: 'checkout-flow-debug',
      input: { postcode, city, countryCode, street },
      results: []
    };
    
    // Step 1: Test cart data
    console.log('📦 Step 1: Testing cart data...');
    const sb = await supabaseServer();
    const adminSb = getSupabaseAdmin();
    
    try {
      // Get cart items (simulating what checkout page does)
      const { data: cartItems, error: cartError } = await sb
        .from("cart_items")
        .select(`
          id,
          quantity,
          wines (
            id,
            handle,
            wine_name,
            vintage,
            producer_id
          )
        `)
        .limit(5); // Get some sample items
        
      if (cartError) {
        debugResults.results.push({
          step: 'cart-fetch',
          success: false,
          error: cartError.message
        });
        console.log('❌ Cart fetch failed:', cartError);
      } else {
        debugResults.results.push({
          step: 'cart-fetch',
          success: true,
          cartItems: cartItems?.length || 0,
          sampleItems: cartItems?.slice(0, 2) || []
        });
        console.log(`✅ Found ${cartItems?.length || 0} cart items`);
        
        if (cartItems && cartItems.length > 0) {
          // Test wine lookup (what zone-matching does)
          const wineIds = cartItems.map(item => item.wines.id);
          console.log('🍷 Wine IDs from cart:', wineIds);
          
          const { data: wines, error: winesError } = await adminSb
            .from("wines")
            .select("id, producer_id")
            .in("id", wineIds);
            
          if (winesError) {
            debugResults.results.push({
              step: 'wine-lookup',
              success: false,
              error: winesError.message
            });
            console.log('❌ Wine lookup failed:', winesError);
          } else {
            debugResults.results.push({
              step: 'wine-lookup',
              success: true,
              wines: wines?.length || 0,
              sampleWines: wines?.slice(0, 2) || []
            });
            console.log(`✅ Found ${wines?.length || 0} wines`);
            
            // Test producer lookup
            if (wines && wines.length > 0) {
              const producerIds = [...new Set(wines.map(wine => wine.producer_id))];
              console.log('🏭 Producer IDs:', producerIds);
              
              const { data: producers, error: producersError } = await adminSb
                .from("producers")
                .select(`
                  id,
                  name,
                  pickup_zone_id,
                  pallet_zones!pickup_zone_id (
                    id,
                    name,
                    zone_type
                  )
                `)
                .in("id", producerIds);
                
              if (producersError) {
                debugResults.results.push({
                  step: 'producer-lookup',
                  success: false,
                  error: producersError.message
                });
                console.log('❌ Producer lookup failed:', producersError);
              } else {
                debugResults.results.push({
                  step: 'producer-lookup',
                  success: true,
                  producers: producers?.length || 0,
                  pickupZones: producers?.map(p => p.pallet_zones).filter(Boolean) || []
                });
                console.log(`✅ Found ${producers?.length || 0} producers with pickup zones`);
              }
            }
          }
        }
      }
    } catch (error) {
      debugResults.results.push({
        step: 'cart-analysis',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ Cart analysis failed:', error);
    }
    
    // Step 2: Test delivery zones
    console.log('🌍 Step 2: Testing delivery zones...');
    try {
      const { data: deliveryZones, error: deliveryZonesError } = await adminSb
        .from("pallet_zones")
        .select("id, name, center_lat, center_lon, radius_km, country_code, zone_type")
        .eq("zone_type", "delivery")
        .or(`country_code.eq.${countryCode},country_code.is.null`);
        
      if (deliveryZonesError) {
        debugResults.results.push({
          step: 'delivery-zones-fetch',
          success: false,
          error: deliveryZonesError.message
        });
        console.log('❌ Delivery zones fetch failed:', deliveryZonesError);
      } else {
        debugResults.results.push({
          step: 'delivery-zones-fetch',
          success: true,
          zones: deliveryZones?.length || 0,
          zones: deliveryZones || []
        });
        console.log(`✅ Found ${deliveryZones?.length || 0} delivery zones`);
        
        // Step 3: Test geocoding
        console.log('📍 Step 3: Testing geocoding...');
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
        
        console.log('🌍 Geocoding address:', fullAddress);
        const geocodeResult = await geocodeAddress(fullAddress);
        
        if ('error' in geocodeResult) {
          debugResults.results.push({
            step: 'geocoding',
            success: false,
            error: geocodeResult.message,
            address: fullAddress
          });
          console.log('❌ Geocoding failed:', geocodeResult.message);
        } else {
          debugResults.results.push({
            step: 'geocoding',
            success: true,
            address: fullAddress,
            coordinates: { lat: geocodeResult.lat, lon: geocodeResult.lon },
            display_name: geocodeResult.display_name
          });
          console.log(`✅ Geocoding successful: ${geocodeResult.lat}, ${geocodeResult.lon}`);
          
          // Step 4: Test zone matching
          console.log('🎯 Step 4: Testing zone matching...');
          const addressLat = geocodeResult.lat;
          const addressLon = geocodeResult.lon;
          
          const zoneMatching = [];
          for (const zone of deliveryZones || []) {
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
            }
          }
          
          debugResults.results.push({
            step: 'zone-matching',
            success: true,
            zoneMatching,
            matchingZones: zoneMatching.filter(z => z.matches).length
          });
        }
      }
    } catch (error) {
      debugResults.results.push({
        step: 'delivery-analysis',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('❌ Delivery analysis failed:', error);
    }
    
    console.log('🔍 COMPREHENSIVE CHECKOUT FLOW DEBUG END');
    
    return NextResponse.json({
      success: true,
      debugResults
    });
    
  } catch (error) {
    console.error('❌ Comprehensive debug error:', error);
    return NextResponse.json(
      { 
        error: 'Comprehensive debug failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
