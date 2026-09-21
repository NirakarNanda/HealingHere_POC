/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Same-origin API proxy: the browser talks to /api/* on the frontend
    // origin, so the session cookie is first-party (never blocked as a
    // third-party cookie). Next.js forwards the request server-side to the
    // real backend, preserving method, body, and cookies.
    const backend =
      process.env.BACKEND_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:5000"
        : "https://healinghere-backend.vercel.app");
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};
export default nextConfig;
