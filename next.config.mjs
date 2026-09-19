import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  /** Bundled Chromium (@sparticuz/chromium) must not be webpack-bundled into serverless chunks. */
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "sharp"],
  async headers() {
    return [
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin/operations/okrs",
        destination: "/admin/operations/objectives",
        permanent: true,
      },
      {
        source: "/admin/operations/okrs/settings",
        destination: "/admin/operations/objectives/settings",
        permanent: true,
      },
      {
        source: "/admin/operations/okrs/:id",
        destination: "/admin/operations/objectives/:id",
        permanent: true,
      },
      {
        source: "/admin/bookings",
        destination: "/admin/b2c-orders",
        permanent: true,
      },
      {
        source: "/admin/reservations",
        destination: "/admin/b2c-orders",
        permanent: true,
      },
      {
        source: "/admin/reservations/:id",
        destination: "/admin/b2c-orders/:id",
        permanent: true,
      },
      {
        source: "/admin/bookings/dirty-wine",
        destination: "/admin/b2b-orders",
        permanent: true,
      },
      {
        source: "/how-it-works",
        destination: "/om-oss",
        permanent: true,
      },
      {
        source: "/vilkor",
        destination: "/villkor",
        permanent: true,
      },
      {
        source: "/boxes",
        destination: "/vin/wine-boxes",
        permanent: true,
      },
      // Removed weekly recommendation guides (duplicate of ranked Systembolaget lists)
      {
        source: "/guider/rekommenderade-naturviner",
        destination: "/guider",
        permanent: true,
      },
      {
        source: "/guider/rekommenderade-naturviner/:path*",
        destination: "/guider",
        permanent: true,
      },
      {
        source: "/guider/rekommenderade-naturviner-v:slug",
        destination: "/guider",
        permanent: true,
      },
      {
        source: "/guides/recommended-natural-wines",
        destination: "/guides",
        permanent: true,
      },
      {
        source: "/guides/recommended-natural-wines/:path*",
        destination: "/guides",
        permanent: true,
      },
      {
        source: "/guides/recommended-natural-wines-w:slug",
        destination: "/guides",
        permanent: true,
      },
      // Legacy Languedoc editorial pages → merged guide under /guider
      {
        source: "/languedoc",
        destination: "/guider/naturvin-languedoc",
        permanent: true,
      },
      {
        source: "/languedoc/naturvin",
        destination: "/guider/naturvin-languedoc",
        permanent: true,
      },
      // Legacy EN public profiles → /producers/:slug (portal segments excluded)
      // Keep in sync with PRODUCER_PORTAL_SEGMENTS in lib/i18n/localized-routes.ts
      {
        source:
          "/producer/:slug((?!wines|labels|profile|settings|orders|pallets|signup)[^/]+)",
        destination: "/producers/:slug",
        permanent: true,
      },
      // Legacy SV public profiles → /producenter/:slug
      {
        source: "/producent/:slug",
        destination: "/producenter/:slug",
        permanent: true,
      },
    ];
  },
  /* Vercel configuration */
  experimental: {
    // Enable experimental features for better performance
    inlineCss: true,
    useCache: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "zylq-002.dx.commercecloud.salesforce.com",
      },
      {
        protocol: "https",
        hostname: "edge.disstg.commercecloud.salesforce.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "pactwines.com",
      },
      {
        protocol: "https",
        hostname: "product-cdn.systembolaget.se",
        pathname: "/**",
      },
    ],
  },
  eslint: {
    // Temporarily ignore ESLint errors during builds for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during builds for deployment
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
