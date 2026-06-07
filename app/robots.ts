import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/shop",
          "/product/",
          "/producer/",
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
