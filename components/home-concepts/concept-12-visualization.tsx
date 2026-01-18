"use client";

import { useState, useEffect } from "react";
import { Package, TrendingUp, Wine, Package2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/shopify/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  full_name?: string;
  email?: string;
}

interface LocationWeather {
  location: {
    city: string;
    country: string;
  };
  weather: {
    temp: number;
    condition: string;
    description: string;
    feelsLike: number;
  };
}

interface PalletSummary {
  palletId: string;
  name: string;
  userBottles: number;
  totalBottles: number;
  capacity: number;
  progress: number;
  wines: Array<{
    wine_name: string;
    label_image_path: string | null;
    quantity: number;
  }>;
}

export function Concept12Visualization() {
  const [items, setItems] = useState<Array<{
    id: number;
    height: number;
    color: string;
  }>>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [locationWeather, setLocationWeather] = useState<LocationWeather | null>(null);
  const [personalDescription, setPersonalDescription] = useState<string>("");
  const [pallets, setPallets] = useState<PalletSummary[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  // Generate items on client side only to avoid hydration mismatch
  useEffect(() => {
    const colors = [
      "#ffffff", // white
      "#525252", // gray
      "#3b82f6", // blue
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#ef4444", // red
      "#f59e0b", // amber
      "#10b981", // green
      "#06b6d4", // cyan
    ];
    
    const generatedItems = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      height: Math.floor(Math.random() * 400) + 100,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    
    setItems(generatedItems);
    setLoadingItems(false);
  }, []);

  // Fetch profile, location/weather, and pallets
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile
        const profileRes = await fetch("/api/user/profile");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.profile);
        }

        // Fetch location and weather
        const weatherRes = await fetch("/api/user/location-weather");
        if (weatherRes.ok) {
          const weatherData = await weatherRes.json();
          setLocationWeather(weatherData);
        }

        // Fetch pallets summary
        const palletsRes = await fetch("/api/user/pallets/summary");
        if (palletsRes.ok) {
          const palletsData = await palletsRes.json();
          setPallets(palletsData.pallets || []);
        }

        // Fetch featured products (same as homepage - 5 most recent)
        const productsRes = await fetch("/api/crowdvine/products?limit=5&sortKey=CREATED_AT&reverse=true");
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          if (productsData && productsData.length > 0) {
            setFeaturedProducts(productsData);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Generate personal description when data is available
  useEffect(() => {
    if (!locationWeather) {
      setPersonalDescription("A dynamic layout system with balanced distribution.");
      return;
    }

    const now = new Date();
    
    // Format day of week (Swedish)
    const dayOfWeek = now.toLocaleDateString("sv-SE", { weekday: "long" });
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    
    // Format time (HH:mm)
    const time = now.toLocaleTimeString("sv-SE", { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: false 
    });
    
    // Format date (e.g., "15 januari 2024")
    const date = now.toLocaleDateString("sv-SE", { 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    });
    
    const city = locationWeather.location.city;
    const country = locationWeather.location.country;
    const temp = locationWeather.weather.temp;
    const weatherDesc = locationWeather.weather.description;
    
    // Create personal description
    const description = `${capitalizedDay}, ${time} • ${date} • ${temp}°C och ${weatherDesc} i ${city}, ${country}`;
    
    setPersonalDescription(description);
  }, [locationWeather]);

  const userName = profile?.full_name || profile?.email?.split("@")[0] || "there";

  return (
    <main className="min-h-screen bg-background p-1 lg:p-2 pt-20 md:pt-top-spacing">
      <div className="mb-4 md:px-sides md:pt-sides">
        <h1 className="text-2xl font-bold mb-3 text-foreground text-balance">Welcome Back {userName}</h1>
        <p className="text-muted-foreground text-sm">{personalDescription || "A dynamic layout system with balanced distribution."}</p>
      </div>

      {loadingItems ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Laddar grid...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 auto-rows-[20px]">
          {items.map((item) => {
              // Special handling for card 1 (pallets)
            if (item.id === 0) {
              const primaryPallet = pallets[0]; // Show first pallet or empty state
              const progress = primaryPallet?.progress || 0;
              const hasPallets = pallets.length > 0;
              
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200/70 bg-white/90 backdrop-blur overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all duration-200 group relative"
                  style={{
                    gridRowEnd: `span ${Math.ceil(item.height / 20)}`,
                  }}
                >
                  {hasPallets && primaryPallet ? (
                    <div className="h-full flex flex-col p-4 md:p-6">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package2 className="w-5 h-5 text-gray-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            Active Pallets
                          </h3>
                          <p className="text-xs text-gray-500">
                            {pallets.length} {pallets.length === 1 ? "pallet" : "pallets"}
                          </p>
                        </div>
                      </div>

                      {/* Progress Section */}
                      <div className="flex-1 flex flex-col justify-center space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-gray-900">
                              {primaryPallet.userBottles}
                            </span>
                            <span className="text-sm text-gray-500">
                              / {primaryPallet.capacity} bottles
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-900 transition-all duration-500 ease-out rounded-full"
                              style={{ width: `${Math.min(progress * 100, 100)}%` }}
                            />
                          </div>
                          
                          <p className="text-xs text-gray-500">
                            {Math.round(progress * 100)}% full
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
                        <Package2 className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        No active pallets
                      </p>
                      <p className="text-xs text-gray-500">
                        Join a pallet to get started
                      </p>
                    </div>
                  )}
                </div>
              );
            }

            // Special handling for product cards (cards 2-6)
            // Card 2 = featuredProducts[0], Card 3 = featuredProducts[1], etc.
            const productIndex = item.id - 1; // item.id 1 = index 0, item.id 2 = index 1, etc.
            if (productIndex >= 0 && productIndex < featuredProducts.length) {
              const product = featuredProducts[productIndex];
              const hasImage = product.featuredImage && product.featuredImage.url;
              // Alternate label positions for visual variety
              const labelPositions: Array<"top-left" | "top-right" | "bottom-left" | "bottom-right"> = [
                "bottom-right",
                "bottom-left",
                "top-right",
                "top-left",
                "bottom-right",
              ];
              const labelPosition = labelPositions[productIndex] || "bottom-right";
              
              return (
                <div
                  key={item.id}
                  className="relative rounded-lg border border-border overflow-hidden hover:border-foreground/20 transition-all duration-200"
                  style={{
                    gridRowEnd: `span ${Math.ceil(item.height / 20)}`,
                  }}
                >
                  {/* Match the exact structure from homepage */}
                  <div className="relative h-full">
                    {/* NEW Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-black text-white border-black uppercase font-semibold text-xs">
                        NEW
                      </Badge>
                    </div>

                    <Link
                      href={`/product/${product.handle}`}
                      className="block w-full h-full"
                      prefetch
                    >
                      {hasImage ? (
                        <Image
                          src={product.featuredImage.url}
                          alt={product.featuredImage.altText || product.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
                        />
                      ) : (
                        <div className="size-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">
                            No image available
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Product label overlay - matching homepage style */}
                    <div
                      className={cn(
                        "absolute flex p-4 inset-0 items-end justify-end pointer-events-none",
                        labelPosition === "top-left" && "md:justify-start md:items-start",
                        labelPosition === "top-right" && "md:justify-end md:items-start",
                        labelPosition === "bottom-left" && "md:justify-start md:items-end",
                        labelPosition === "bottom-right" && "md:justify-end md:items-end",
                      )}
                    >
                      <div className="pointer-events-auto">
                        <div className="flex gap-2 items-center p-2 pl-8 bg-white rounded-md max-w-full">
                          <div className="pr-6 leading-4 overflow-hidden">
                            <Link
                              href={`/product/${product.handle}`}
                              className="inline-block w-full truncate text-base font-semibold opacity-80 mb-1.5"
                            >
                              {product.title}
                            </Link>
                            {product.producerName && (
                              <p className="text-xs text-muted-foreground font-normal mb-1">
                                {product.producerName}
                              </p>
                            )}
                            <div className="flex gap-2 items-center text-base font-semibold">
                              <span className="text-base font-semibold">
                                {new Intl.NumberFormat("sv-SE", {
                                  style: "currency",
                                  currency: product.priceRange.minVariantPrice.currencyCode || "SEK",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(parseFloat(product.priceRange.minVariantPrice.amount))}
                              </span>
                            </div>
                          </div>
                          {/* Add to cart button would go here - using Suspense for now */}
                          <div className="flex-shrink-0">
                            <Link
                              href={`/product/${product.handle}`}
                              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors border hover:border-border/15 backdrop-blur-sm ring-1 ring-offset-primary/10 ring-border/10 ring-offset-2 hover:ring-primary/15 hover:ring-offset-4 hover:ring-offset-black/20 shadow-button hover:shadow-button-hover px-4 py-2 size-12 bg-black hover:bg-black/90 text-white border-black rounded-md"
                              aria-label="View product"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right">
                                <path d="M5 12h14"></path>
                                <path d="m12 5 7 7-7 7"></path>
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Special handling for card 3 (Wine Identity)
            if (item.id === 2) {
              return (
                <Link
                  key={item.id}
                  href="/wine-identity"
                  className="rounded-xl border border-gray-200/70 bg-white/90 backdrop-blur overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all duration-200 group relative block h-full"
                  style={{
                    gridRowEnd: `span ${Math.ceil(item.height / 20)}`,
                  }}
                >
                  <div className="h-full flex flex-col p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Wine className="w-5 h-5 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          Wine Identity
                        </h3>
                        <p className="text-xs text-gray-500">
                          Discover your taste
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-sm text-gray-600 mb-4">
                        Answer a few questions about your wine preferences to get personalized recommendations.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Get started</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right">
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            }

            // Regular cards (after products, or if no products available)
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border overflow-hidden hover:border-foreground/20 transition-all duration-200 group"
                style={{
                  backgroundColor: item.color,
                  gridRowEnd: `span ${Math.ceil(item.height / 20)}`,
                }}
              >
                <div className="p-6 h-full flex items-start justify-start">
                  <span
                    className={`text-sm font-medium ${
                      item.color === "#ffffff" ? "text-black" : "text-white"
                    } opacity-60 group-hover:opacity-100 transition-opacity duration-200`}
                  >
                    {String(item.id + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
