import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  /** Bundled Chromium (@sparticuz/chromium) must not be webpack-bundled into serverless chunks. */
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core", "sharp"],
  async rewrites() {
    return [
      // Pretty weekly-issue URLs → nested App Router segments.
      // Folders like `…-v[slug]` break Next route discovery; keep public paths
      // via rewrite onto valid `/v/[slug]` and `/w/[slug]` pages.
      {
        source: "/guider/rekommenderade-naturviner-v:slug",
        destination: "/guider/rekommenderade-naturviner/v/:slug",
      },
      {
        source: "/guides/recommended-natural-wines-w:slug",
        destination: "/guides/recommended-natural-wines/w/:slug",
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
    deviceSizes: [384, 640, 750, 828, 1080, 1200],
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
