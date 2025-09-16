const nextConfig = {
  /* Cloudflare Pages configuration */
  // Only export for production builds (Cloudflare Pages)
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: true,
  experimental: {
    // Enable experimental features for development
    inlineCss: true,
    useCache: true,
    clientSegmentCache: true,
  },
  images: {
    unoptimized: true, // Required for static export
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zylq-002.dx.commercecloud.salesforce.com",
      },
      {
        protocol: "https",
        hostname: "edge.disstg.commercecloud.salesforce.com",
      },
    ],
  },
  eslint: {
    // Only ignore ESLint errors during production builds (Cloudflare Pages)
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  typescript: {
    // Only ignore TypeScript errors during production builds (Cloudflare Pages)
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
