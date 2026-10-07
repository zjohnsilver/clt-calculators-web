import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * The site calls nothing: no API, no analytics, no font CDN (next/font self-hosts at
 * build time). `connect-src 'self'` is what makes "nothing you type leaves your
 * browser" a property of the page rather than a promise in its footer.
 *
 * `script-src` allows `'unsafe-inline'` because Next inlines its own bootstrap; a
 * nonce per request would force dynamic rendering on a site that is otherwise static.
 * Development needs `'unsafe-eval'` and `ws:` for the HMR runtime.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
