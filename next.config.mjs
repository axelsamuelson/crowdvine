const nextConfig = {
  /* Cloudflare Pages configuration */
  output: 'export',
  trailingSlash: true,
  experimental: {
    // Disable experimental features that might block export
    // inlineCss: true, // Commented out - might cause issues with static export
    // useCache: true, // Commented out - might cause issues with static export
    // clientSegmentCache: true, // Commented out - might cause issues with static export
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
};

export default nextConfig;
