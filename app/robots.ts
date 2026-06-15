import { MetadataRoute } from "next";

// TODO: robots.ts är statisk och kan inte differentiera per domän. För dirtywine.se-specifik
// robots: implementera en middleware-baserad lösning eller en separat /robots.txt-route.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/vin",
          "/wine",
          "/product/",
          "/produkt/",
          "/producer/",
          "/producent/",
          "/producers",
          "/about",
        ],
        disallow: [
          "/admin",
          "/api/",
          "/checkout",
          "/cart",
          "/access-request",
          "/access-pending",
          "/profile",
          "/log-in",
          "/signup",
          "/reset-password",
          "/forgot-password",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://pactwines.com/sitemap.xml",
  };
}
