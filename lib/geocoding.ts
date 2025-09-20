// Geocoding service using OpenStreetMap Nominatim API (free)
// This service converts addresses to coordinates

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface GeocodeError {
  error: string;
  message: string;
}

// Cache for geocoding results to avoid repeated API calls
const geocodeCache = new Map<string, GeocodeResult>();

// Function to clear geocoding cache (useful for debugging)
export function clearGeocodeCache() {
  geocodeCache.clear();
  console.log('🧹 Geocoding cache cleared');
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | GeocodeError> {
  // Clean and normalize the address
  const cleanAddress = address.trim().replace(/\s+/g, ' ');
  
  // Check cache first
  if (geocodeCache.has(cleanAddress)) {
    console.log('📍 Using cached geocode result for:', cleanAddress);
    return geocodeCache.get(cleanAddress)!;
  }

  try {
    console.log('🌍 Geocoding address:', cleanAddress);
    
    // Use OpenStreetMap Nominatim API (free, no API key required)
    // Add User-Agent header to avoid 403 errors
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(cleanAddress)}&` +
      `limit=1&` +
      `addressdetails=1&` +
      `countrycodes=se,no,dk,fi,fr,de,gb,es,it&` + // Nordic + European countries
      `accept-language=en`,
      {
        headers: {
          'User-Agent': 'CrowdVine/1.0 (https://pactwines.com)',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return {
        error: 'NO_RESULTS',
        message: 'No coordinates found for this address'
      };
    }

    const result = data[0];
    const geocodeResult: GeocodeResult = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      display_name: result.display_name,
      address: result.address ? {
        house_number: result.address.house_number,
        road: result.address.road,
        city: result.address.city || result.address.town || result.address.village,
        postcode: result.address.postcode,
        country: result.address.country,
        country_code: result.address.country_code?.toUpperCase()
      } : undefined
    };

    // Cache the result
    geocodeCache.set(cleanAddress, geocodeResult);
    
    console.log('✅ Geocoded successfully:', {
      address: cleanAddress,
      lat: geocodeResult.lat,
      lon: geocodeResult.lon,
      city: geocodeResult.address?.city
    });

    return geocodeResult;

  } catch (error) {
    console.error('❌ Primary geocoding failed:', error);
    
    // Fallback: Try with a simpler address format
    try {
      console.log('🔄 Trying fallback geocoding...');
      const simpleAddress = address.split(',')[0] + ', Sweden'; // Just street + country
      
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(simpleAddress)}&` +
        `limit=1&` +
        `countrycodes=se&` +
        `accept-language=en`,
        {
          headers: {
            'User-Agent': 'CrowdVine/1.0 (https://pactwines.com)',
            'Accept': 'application/json'
          }
        }
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          const result = fallbackData[0];
          const geocodeResult: GeocodeResult = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            display_name: result.display_name,
            address: result.address ? {
              house_number: result.address.house_number,
              road: result.address.road,
              city: result.address.city || result.address.town || result.address.village,
              postcode: result.address.postcode,
              country: result.address.country,
              country_code: result.address.country_code?.toUpperCase()
            } : undefined
          };

          // Cache the result
          geocodeCache.set(cleanAddress, geocodeResult);
          
          console.log('✅ Fallback geocoding successful:', {
            address: cleanAddress,
            lat: geocodeResult.lat,
            lon: geocodeResult.lon
          });

          return geocodeResult;
        }
      }
    } catch (fallbackError) {
      console.error('❌ Fallback geocoding also failed:', fallbackError);
    }
    
    return {
      error: 'GEOCODING_FAILED',
      message: `Failed to geocode address: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper function to create a full address string
export function createFullAddress(parts: {
  street?: string;
  postcode?: string;
  city?: string;
  country?: string;
}): string {
  const addressParts = [];
  
  if (parts.street) addressParts.push(parts.street);
  if (parts.postcode) addressParts.push(parts.postcode);
  if (parts.city) addressParts.push(parts.city);
  if (parts.country) addressParts.push(parts.country);
  
  return addressParts.join(', ');
}

// Helper function to geocode from separate address fields
export async function geocodeFromFields(fields: {
  street?: string;
  postcode?: string;
  city: string;
  country: string;
}): Promise<GeocodeResult | GeocodeError> {
  // Validate required fields
  if (!fields.city || !fields.country) {
    return {
      error: 'MISSING_REQUIRED_FIELDS',
      message: 'City and country are required for geocoding'
    };
  }

  // Create address string from fields
  const addressParts = [];
  
  if (fields.street) addressParts.push(fields.street);
  if (fields.postcode) addressParts.push(fields.postcode);
  addressParts.push(fields.city);
  addressParts.push(fields.country);
  
  const fullAddress = addressParts.join(', ');
  
  return await geocodeAddress(fullAddress);
}

// Helper function to validate coordinates
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
