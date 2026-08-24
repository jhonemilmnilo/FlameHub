import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";


/**
 * 🛡️ Fortress-Grade HTTP Security Headers (Anti-Clickjacking, Anti-XSS, Anti-MIME Sniffing)
 */
const securityHeaders = [
  // 1. Anti-Clickjacking: Disallow any framing by external domains
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // 2. MIME Sniffing Defense: Force browsers to strictly adhere to declared MIME types
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // 3. Referrer Policy: Send full referrer on same-origin, origin only on cross-origin HTTPS
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // 4. DNS Prefetch Control: Speed up page load securely
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // 5. Strict-Transport-Security (HSTS): Force HTTPS connection for 2 years
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // 6. Permissions Policy: Restrict unauthorized hardware device access
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // 7. Content-Security-Policy (CSP): Whitelist only trusted scripts, styles, fonts, and API endpoints
  //    🔑 'unsafe-eval' is ONLY allowed in development — React/Turbopack requires it for hot-reload
  //    and source map reconstruction. It is NEVER included in production builds.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' blob: data: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];


const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
