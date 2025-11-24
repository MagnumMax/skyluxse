/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    optimizeCss: true,
    testProxy: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/sales/bookings",
        destination: "/bookings",
        permanent: true,
      },
      {
        source: "/sales/bookings/:bookingId",
        destination: "/bookings/:bookingId",
        permanent: true,
      },
      {
        source: "/sales/clients",
        destination: "/clients",
        permanent: true,
      },
      {
        source: "/sales/clients/:clientId",
        destination: "/clients/:clientId",
        permanent: true,
      },
      {
        source: "/sales/analytics",
        destination: "/analytics",
        permanent: true,
      },
      {
        source: "/sales/fleet-calendar",
        destination: "/fleet-calendar",
        permanent: true,
      },
      {
        source: "/operations/tasks",
        destination: "/tasks",
        permanent: true,
      },
      {
        source: "/operations/tasks/:taskId",
        destination: "/tasks/:taskId",
        permanent: true,
      },
      {
        source: "/operations/fleet",
        destination: "/fleet",
        permanent: true,
      },
      {
        source: "/operations/fleet/:carId",
        destination: "/fleet/:carId",
        permanent: true,
      },
      {
        source: "/operations/fleet/new",
        destination: "/fleet/new",
        permanent: true,
      },
      {
        source: "/operations/maintenance/new",
        destination: "/maintenance/new",
        permanent: true,
      },
      {
        source: "/operations/bookings/new",
        destination: "/bookings/new",
        permanent: true,
      },
      {
        source: "/operations/bookings/:bookingId",
        destination: "/bookings/:bookingId?view=operations",
        permanent: true,
      },
      {
        source: "/operations/documents/:docId",
        destination: "/documents/:docId",
        permanent: true,
      },
      {
        source: "/operations/fleet-calendar",
        destination: "/fleet-calendar",
        permanent: true,
      },
      {
        source: "/exec/bookings",
        destination: "/bookings?view=exec",
        permanent: true,
      },
      {
        source: "/exec/bookings/:bookingId",
        destination: "/bookings/:bookingId?view=exec",
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
