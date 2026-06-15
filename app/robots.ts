import { MetadataRoute } from "next";

// TODO: robots.ts är statisk och kan inte differentiera per domän. För dirtywine.se-specifik
// robots: implementera en middleware-baserad lösning eller en separat /robots.txt-route.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
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
          "/taste-quiz",
          "/tasting/",
          "/pallet/",
          "/i/",
          "/ib/",
          "/b/",
          "/p/",
          "/c/",
        ],
      },
    ],
    sitemap: "https://pactwines.com/sitemap.xml",
  };
}
