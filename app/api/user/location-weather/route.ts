import { NextResponse } from "next/server";

/**
 * GET /api/user/location-weather
 *
 * Returns user's location and weather based on IP address
 */
export async function GET(request: Request) {
  try {
    // Get IP address from request headers
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded?.split(",")[0] || realIp || "8.8.8.8"; // Fallback to Google DNS for development

    // For development, use a default location (Stockholm)
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      // Development fallback - Stockholm, Sweden
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=59.3293&lon=18.0686&appid=${process.env.OPENWEATHER_API_KEY || "demo"}&units=metric&lang=sv`
      ).catch(() => null);

      if (weatherResponse?.ok) {
        const weatherData = await weatherResponse.json();
        return NextResponse.json({
          location: {
            city: "Stockholm",
            country: "Sweden",
            lat: 59.3293,
            lon: 18.0686,
          },
          weather: {
            temp: Math.round(weatherData.main.temp),
            condition: weatherData.weather[0].main.toLowerCase(),
            description: weatherData.weather[0].description,
            feelsLike: Math.round(weatherData.main.feels_like),
          },
        });
      }

      // Fallback if weather API fails
      return NextResponse.json({
        location: {
          city: "Stockholm",
          country: "Sweden",
        },
        weather: {
          temp: 5,
          condition: "cloudy",
          description: "molnigt",
          feelsLike: 3,
        },
      });
    }

    // Try to get location from IP (using ip-api.com - free tier)
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,lat,lon`);
      const geoData = await geoResponse.json();

      if (geoData.status === "success") {
        // Get weather based on coordinates
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${geoData.lat}&lon=${geoData.lon}&appid=${process.env.OPENWEATHER_API_KEY || "demo"}&units=metric&lang=sv`
        ).catch(() => null);

        if (weatherResponse?.ok) {
          const weatherData = await weatherResponse.json();
          return NextResponse.json({
            location: {
              city: geoData.city || "Unknown",
              country: geoData.country || "Unknown",
              lat: geoData.lat,
              lon: geoData.lon,
            },
            weather: {
              temp: Math.round(weatherData.main.temp),
              condition: weatherData.weather[0].main.toLowerCase(),
              description: weatherData.weather[0].description,
              feelsLike: Math.round(weatherData.main.feels_like),
            },
          });
        }
      }
    } catch (error) {
      console.error("Error fetching location:", error);
    }

    // Final fallback
    return NextResponse.json({
      location: {
        city: "Stockholm",
        country: "Sweden",
      },
      weather: {
        temp: 5,
        condition: "cloudy",
        description: "molnigt",
        feelsLike: 3,
      },
    });
  } catch (error) {
    console.error("Error fetching location/weather:", error);
    return NextResponse.json(
      {
        location: {
          city: "Stockholm",
          country: "Sweden",
        },
        weather: {
          temp: 5,
          condition: "cloudy",
          description: "molnigt",
          feelsLike: 3,
        },
      },
      { status: 200 }, // Return fallback data instead of error
    );
  }
}





