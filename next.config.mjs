import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    importScripts: ["/custom-worker.js"],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-webfonts",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts-stylesheets",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-font-assets",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-image",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        urlPattern: /\/api\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "apis",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 10, // fallback to cache if network slow
        },
      },
      {
        urlPattern: /.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "others",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    optimizeCss: true,
    testProxy: true,
  },
  serverExternalPackages: ["@zohocrm/nodejs-sdk-7.0"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bylxzpvyzvycrpkwxvle.supabase.co",
      },
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

export default withPWA(nextConfig);
