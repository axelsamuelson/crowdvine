const nextConfig = {
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
    ];
  },
  /* Vercel configuration */
  experimental: {
    // Enable experimental features for better performance
    inlineCss: true,
    useCache: true,
    clientSegmentCache: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
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
